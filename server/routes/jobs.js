const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// SQL template for eligibility engine from Project Document Section 6.3
const ELIGIBILITY_SQL = `
SELECT 
  u.user_id, 
  u.full_name,
  u.email,
  u.cgpa,
  u.passout_year,
  s.attendance_pct,
  s.avg_mock_pct,
  j.min_cgpa,
  j.eligible_passout_year,
  j.min_attendance,
  j.min_mock_score,
  (u.cgpa >= j.min_cgpa)                     AS cgpa_ok,
  (u.passout_year = j.eligible_passout_year) AS year_ok,
  (s.attendance_pct >= j.min_attendance)     AS attendance_ok,
  (s.avg_mock_pct  >= j.min_mock_score)      AS mock_ok,
  NOT EXISTS (
    SELECT 1 FROM job_skills js
    WHERE js.job_id = j.job_id
      AND js.skill_id NOT IN (SELECT ss.skill_id FROM student_skills ss
                              WHERE ss.student_id = u.user_id)
  )                                          AS skills_ok
FROM users u
JOIN student_stats s ON s.user_id = u.user_id
CROSS JOIN job_requirements j
WHERE j.job_id = $1 AND u.role = 'STUDENT'
`;

// Helper: Calculate reasons for ineligibility from SQL flags
function parseEligibility(row) {
  const isEligible = Boolean(row.cgpa_ok && row.year_ok && row.attendance_ok && row.mock_ok && row.skills_ok);
  const reasons = [];

  if (!row.cgpa_ok) {
    reasons.push(`CGPA is ${Number(row.cgpa).toFixed(2)} (Minimum required: ${Number(row.min_cgpa).toFixed(2)})`);
  }
  if (!row.year_ok) {
    reasons.push(`Passout year is ${row.passout_year} (Eligible batch: ${row.eligible_passout_year})`);
  }
  if (!row.attendance_ok) {
    reasons.push(`Attendance is ${Number(row.attendance_pct).toFixed(1)}% (Minimum required: ${row.min_attendance}%)`);
  }
  if (!row.mock_ok) {
    reasons.push(`Mock exam avg is ${Number(row.avg_mock_pct).toFixed(1)}% (Minimum required: ${row.min_mock_score}%)`);
  }
  if (!row.skills_ok) {
    reasons.push(`Missing one or more required technical skills for this role`);
  }

  return { isEligible, reasons };
}

// POST /api/jobs (HR creates a structured job card)
router.post('/', authenticateToken, requireRole('HR', 'ADMIN'), async (req, res) => {
  try {
    const {
      company_name,
      job_profile,
      description,
      package_lpa,
      min_cgpa,
      eligible_passout_year,
      min_attendance,
      min_mock_score,
      deadline,
      skill_ids
    } = req.body;

    if (!company_name || !job_profile || !package_lpa) {
      return res.status(400).json({ error: 'Company name, job profile, and package LPA are required' });
    }

    // 1. Insert Job Requirement
    const jobRes = await db.query(
      `INSERT INTO job_requirements 
       (company_name, job_profile, description, package_lpa, min_cgpa, eligible_passout_year, min_attendance, min_mock_score, deadline, hr_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        company_name,
        job_profile,
        description || '',
        parseFloat(package_lpa),
        parseFloat(min_cgpa || 0),
        parseInt(eligible_passout_year || new Date().getFullYear()),
        parseInt(min_attendance || 0),
        parseInt(min_mock_score || 0),
        deadline || null,
        req.user.userId
      ]
    );

    const job = jobRes.rows[0];

    // 2. Insert Skills
    if (Array.isArray(skill_ids) && skill_ids.length > 0) {
      for (const sId of skill_ids) {
        await db.query(
          `INSERT INTO job_skills (job_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [job.job_id, sId]
        );
      }
    }

    // 3. Run Eligibility Query against all students to find who qualifies
    const eligibilityCheck = await db.query(ELIGIBILITY_SQL, [job.job_id]);
    
    let notifiedCount = 0;
    const eligibleStudents = [];

    for (const student of eligibilityCheck.rows) {
      const { isEligible } = parseEligibility(student);
      if (isEligible) {
        eligibleStudents.push(student);
        // Create targeted notification
        await db.query(
          `INSERT INTO notifications (user_id, type, title, body, job_id, is_read)
           VALUES ($1, 'NEW_JOB', $2, $3, $4, FALSE)`,
          [
            student.user_id,
            `New Opportunity: ${job.company_name} (${job.package_lpa} LPA)`,
            `You meet all eligibility criteria for the ${job.job_profile} role. Check requirements and apply!`,
            job.job_id
          ]
        );
        notifiedCount++;
      }
    }

    res.status(201).json({
      message: 'Job created and targeted notifications dispatched successfully',
      job,
      eligibleCount: eligibleStudents.length,
      notifiedCount,
      totalStudentsEvaluated: eligibilityCheck.rows.length
    });
  } catch (err) {
    console.error('Job creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs (List jobs; if student, evaluate eligibility for each)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const isStudent = req.user.role === 'STUDENT';

    // Get all jobs with required skills
    const jobsRes = await db.query(`
      SELECT j.*, u.full_name AS hr_name,
        COALESCE(
          (SELECT json_agg(json_build_object('skill_id', s.skill_id, 'name', s.name))
           FROM job_skills js
           JOIN skills s ON s.skill_id = js.skill_id
           WHERE js.job_id = j.job_id), '[]'::json
        ) AS required_skills,
        (SELECT COUNT(*) FROM job_applications ja WHERE ja.job_id = j.job_id) AS total_applications
      FROM job_requirements j
      JOIN users u ON u.user_id = j.hr_id
      ORDER BY j.created_at DESC
    `);

    const jobs = jobsRes.rows;

    if (isStudent) {
      // Evaluate eligibility for this student on all jobs
      for (const job of jobs) {
        // Run single student eligibility check for this job
        const checkRes = await db.query(`
          SELECT 
            u.user_id, u.full_name, u.email, u.cgpa, u.passout_year,
            s.attendance_pct, s.avg_mock_pct,
            j.min_cgpa, j.eligible_passout_year, j.min_attendance, j.min_mock_score,
            (u.cgpa >= j.min_cgpa)                     AS cgpa_ok,
            (u.passout_year = j.eligible_passout_year) AS year_ok,
            (s.attendance_pct >= j.min_attendance)     AS attendance_ok,
            (s.avg_mock_pct  >= j.min_mock_score)      AS mock_ok,
            NOT EXISTS (
              SELECT 1 FROM job_skills js
              WHERE js.job_id = j.job_id
                AND js.skill_id NOT IN (SELECT ss.skill_id FROM student_skills ss
                                        WHERE ss.student_id = u.user_id)
            )                                          AS skills_ok
          FROM users u
          JOIN student_stats s ON s.user_id = u.user_id
          CROSS JOIN job_requirements j
          WHERE j.job_id = $1 AND u.user_id = $2
        `, [job.job_id, req.user.userId]);

        if (checkRes.rows.length > 0) {
          const evalRow = checkRes.rows[0];
          const { isEligible, reasons } = parseEligibility(evalRow);
          job.is_eligible = isEligible;
          job.eligibility_reasons = reasons;
          job.criteria_breakdown = {
            cgpa_ok: evalRow.cgpa_ok,
            year_ok: evalRow.year_ok,
            attendance_ok: evalRow.attendance_ok,
            mock_ok: evalRow.mock_ok,
            skills_ok: evalRow.skills_ok
          };
        } else {
          job.is_eligible = false;
          job.eligibility_reasons = ['Profile stats incomplete'];
        }

        // Check student application status
        const appRes = await db.query(
          `SELECT application_id, status, applied_at FROM job_applications WHERE job_id = $1 AND student_id = $2`,
          [job.job_id, req.user.userId]
        );
        job.application = appRes.rows[0] || null;
      }
    } else {
      // HR/Admin: also compute eligible count for each job
      for (const job of jobs) {
        const countRes = await db.query(`
          SELECT COUNT(*) as count FROM (
            ${ELIGIBILITY_SQL}
          ) sub WHERE cgpa_ok AND year_ok AND attendance_ok AND mock_ok AND skills_ok
        `, [job.job_id]);
        job.eligible_students_count = parseInt(countRes.rows[0]?.count || 0);
      }
    }

    res.json({ jobs });
  } catch (err) {
    console.error('List jobs error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/:id (Single job details)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    const jobRes = await db.query(`
      SELECT j.*, u.full_name AS hr_name,
        COALESCE(
          (SELECT json_agg(json_build_object('skill_id', s.skill_id, 'name', s.name))
           FROM job_skills js
           JOIN skills s ON s.skill_id = js.skill_id
           WHERE js.job_id = j.job_id), '[]'::json
        ) AS required_skills
      FROM job_requirements j
      JOIN users u ON u.user_id = j.hr_id
      WHERE j.job_id = $1
    `, [jobId]);

    if (jobRes.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobRes.rows[0];

    if (req.user.role === 'STUDENT') {
      const checkRes = await db.query(`
        SELECT 
          u.user_id, u.full_name, u.email, u.cgpa, u.passout_year,
          s.attendance_pct, s.avg_mock_pct,
          j.min_cgpa, j.eligible_passout_year, j.min_attendance, j.min_mock_score,
          (u.cgpa >= j.min_cgpa)                     AS cgpa_ok,
          (u.passout_year = j.eligible_passout_year) AS year_ok,
          (s.attendance_pct >= j.min_attendance)     AS attendance_ok,
          (s.avg_mock_pct  >= j.min_mock_score)      AS mock_ok,
          NOT EXISTS (
            SELECT 1 FROM job_skills js
            WHERE js.job_id = j.job_id
              AND js.skill_id NOT IN (SELECT ss.skill_id FROM student_skills ss
                                      WHERE ss.student_id = u.user_id)
          )                                          AS skills_ok
        FROM users u
        JOIN student_stats s ON s.user_id = u.user_id
        CROSS JOIN job_requirements j
        WHERE j.job_id = $1 AND u.user_id = $2
      `, [jobId, req.user.userId]);

      if (checkRes.rows.length > 0) {
        const evalRow = checkRes.rows[0];
        const { isEligible, reasons } = parseEligibility(evalRow);
        job.is_eligible = isEligible;
        job.eligibility_reasons = reasons;
        job.criteria_breakdown = {
          cgpa_ok: evalRow.cgpa_ok,
          year_ok: evalRow.year_ok,
          attendance_ok: evalRow.attendance_ok,
          mock_ok: evalRow.mock_ok,
          skills_ok: evalRow.skills_ok
        };
      }

      const appRes = await db.query(
        `SELECT application_id, status, applied_at FROM job_applications WHERE job_id = $1 AND student_id = $2`,
        [jobId, req.user.userId]
      );
      job.application = appRes.rows[0] || null;
    }

    res.json({ job, rawSql: ELIGIBILITY_SQL });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/:id/eligible (HR view of eligible & ineligible candidates with SQL explanation)
router.get('/:id/eligible', authenticateToken, requireRole('HR', 'ADMIN', 'TRAINER'), async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    const result = await db.query(ELIGIBILITY_SQL, [jobId]);

    const candidates = result.rows.map(row => {
      const { isEligible, reasons } = parseEligibility(row);
      return {
        ...row,
        is_eligible: isEligible,
        reasons
      };
    });

    res.json({
      jobId,
      candidates,
      sqlQuery: ELIGIBILITY_SQL,
      explanation: "Relational query joining users, student_stats view, and job_requirements with correlated NOT EXISTS subquery for skills matching."
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
