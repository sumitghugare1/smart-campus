const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Re-usable eligibility SQL
const ELIGIBILITY_SQL_SINGLE = `
SELECT 
  u.user_id, u.full_name, u.email, u.cgpa, u.passout_year,
  s.attendance_pct, s.avg_mock_pct,
  j.company_name, j.job_profile, j.min_cgpa, j.eligible_passout_year, j.min_attendance, j.min_mock_score,
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
`;

// POST /api/jobs/:id/apply (Student applies)
router.post('/jobs/:id/apply', authenticateToken, requireRole('STUDENT'), async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);
    const studentId = req.user.userId;

    // Check if job exists
    const jobRes = await db.query('SELECT * FROM job_requirements WHERE job_id = $1', [jobId]);
    if (jobRes.rows.length === 0) {
      return res.status(404).json({ error: 'Job requirement not found' });
    }
    const job = jobRes.rows[0];

    // Check if already applied
    const existing = await db.query(
      'SELECT application_id, status FROM job_applications WHERE job_id = $1 AND student_id = $2',
      [jobId, studentId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'You have already applied for this position', application: existing.rows[0] });
    }

    // Server-side strict re-verification of eligibility!
    const checkRes = await db.query(ELIGIBILITY_SQL_SINGLE, [jobId, studentId]);
    if (checkRes.rows.length === 0) {
      return res.status(403).json({ error: 'Student profile stats not found or not eligible' });
    }

    const check = checkRes.rows[0];
    const isEligible = check.cgpa_ok && check.year_ok && check.attendance_ok && check.mock_ok && check.skills_ok;

    if (!isEligible) {
      const failures = [];
      if (!check.cgpa_ok) failures.push(`CGPA is below ${check.min_cgpa}`);
      if (!check.year_ok) failures.push(`Passout year must be ${check.eligible_passout_year}`);
      if (!check.attendance_ok) failures.push(`Attendance is below ${check.min_attendance}%`);
      if (!check.mock_ok) failures.push(`Mock exam average is below ${check.min_mock_score}%`);
      if (!check.skills_ok) failures.push('Missing required skills');

      return res.status(403).json({
        error: 'Application rejected: You do not meet the eligibility requirements for this job.',
        reasons: failures
      });
    }

    // Insert Application
    const appRes = await db.query(
      `INSERT INTO job_applications (job_id, student_id, status)
       VALUES ($1, $2, 'APPLIED')
       RETURNING *`,
      [jobId, studentId]
    );

    // Notify HR
    await db.query(
      `INSERT INTO notifications (user_id, type, title, body, job_id, is_read)
       VALUES ($1, 'APPLICATION_RECEIVED', $2, $3, $4, FALSE)`,
      [
        job.hr_id,
        `New Application: ${req.user.fullName || 'Student'}`,
        `${req.user.fullName || 'A student'} applied for ${job.company_name} - ${job.job_profile}.`,
        jobId
      ]
    );

    res.status(201).json({
      message: 'Application submitted successfully',
      application: appRes.rows[0]
    });
  } catch (err) {
    console.error('Apply error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/:id/applications (HR / Admin views applications for Kanban)
router.get('/jobs/:id/applications', authenticateToken, requireRole('HR', 'ADMIN', 'TRAINER'), async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);

    const appsRes = await db.query(
      `SELECT 
         a.application_id, a.job_id, a.student_id, a.status, a.applied_at, a.updated_at,
         u.full_name, u.email, u.cgpa, u.passout_year,
         b.batch_code,
         s.attendance_pct, s.avg_mock_pct,
         COALESCE(
           (SELECT json_agg(sk.name)
            FROM student_skills ss
            JOIN skills sk ON sk.skill_id = ss.skill_id
            WHERE ss.student_id = u.user_id), '[]'::json
         ) AS student_skills
       FROM job_applications a
       JOIN users u ON u.user_id = a.student_id
       LEFT JOIN batches b ON b.batch_id = u.batch_id
       LEFT JOIN student_stats s ON s.user_id = u.user_id
       WHERE a.job_id = $1
       ORDER BY a.applied_at ASC`,
      [jobId]
    );

    res.json({ applications: appsRes.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/applications/:id/status (HR updates candidate status on Kanban board)
router.patch('/applications/:id/status', authenticateToken, requireRole('HR', 'ADMIN'), async (req, res) => {
  try {
    const applicationId = parseInt(req.params.id);
    const { status } = req.body;

    const validStatuses = ['APPLIED', 'SHORTLISTED', 'MOCK_PENDING', 'SELECTED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const updateRes = await db.query(
      `UPDATE job_applications 
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE application_id = $2
       RETURNING *`,
      [status, applicationId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const updatedApp = updateRes.rows[0];

    // Fetch Job & Student details to send notification
    const details = await db.query(
      `SELECT j.company_name, j.job_profile, u.full_name, u.user_id 
       FROM job_applications a
       JOIN job_requirements j ON j.job_id = a.job_id
       JOIN users u ON u.user_id = a.student_id
       WHERE a.application_id = $1`,
      [applicationId]
    );

    if (details.rows.length > 0) {
      const info = details.rows[0];
      const statusLabels = {
        SHORTLISTED: 'Shortlisted for Next Round',
        MOCK_PENDING: 'Technical Mock Scheduled',
        SELECTED: '🎉 Selected / Placed!',
        REJECTED: 'Application Not Progressed',
        APPLIED: 'Application Under Review'
      };

      await db.query(
        `INSERT INTO notifications (user_id, type, title, body, job_id, is_read)
         VALUES ($1, 'STATUS_UPDATE', $2, $3, $4, FALSE)`,
        [
          info.user_id,
          `Status Update: ${info.company_name} - ${status}`,
          `Your application for ${info.company_name} (${info.job_profile}) is now: ${statusLabels[status] || status}.`,
          updatedApp.job_id
        ]
      );
    }

    res.json({ message: 'Application status updated', application: updatedApp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/my/applications (Student view of their applied drives)
router.get('/my/applications', authenticateToken, async (req, res) => {
  try {
    const studentId = req.user.userId;

    const appsRes = await db.query(
      `SELECT 
         a.application_id, a.job_id, a.status, a.applied_at, a.updated_at,
         j.company_name, j.job_profile, j.package_lpa, j.deadline,
         COALESCE(
           (SELECT json_agg(s.name)
            FROM job_skills js
            JOIN skills s ON s.skill_id = js.skill_id
            WHERE js.job_id = j.job_id), '[]'::json
         ) AS required_skills
       FROM job_applications a
       JOIN job_requirements j ON j.job_id = a.job_id
       WHERE a.student_id = $1
       ORDER BY a.applied_at DESC`,
      [studentId]
    );

    res.json({ applications: appsRes.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
