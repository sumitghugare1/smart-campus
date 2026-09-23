const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/analytics/dashboard (Institute Analytics Dashboard)
router.get('/dashboard', authenticateToken, requireRole('ADMIN', 'HR', 'TRAINER'), async (req, res) => {
  try {
    // 1. Placements per batch (Document Section 6.4)
    const placementsSql = `
      SELECT b.batch_code, b.course_name,
             COUNT(DISTINCT s.user_id) AS total_students,
             COUNT(DISTINCT a.student_id) FILTER (WHERE a.status = 'SELECTED') AS placed_students
      FROM batches b
      JOIN users s ON s.batch_id = b.batch_id AND s.role = 'STUDENT'
      LEFT JOIN job_applications a ON a.student_id = s.user_id
      GROUP BY b.batch_code, b.course_name
      ORDER BY b.batch_code;
    `;
    const placementsRes = await db.query(placementsSql);

    // 2. Application Funnel (Document Section 6.4)
    const funnelSql = `
      SELECT status, COUNT(*) AS count 
      FROM job_applications 
      GROUP BY status 
      ORDER BY 
        CASE status
          WHEN 'APPLIED' THEN 1
          WHEN 'SHORTLISTED' THEN 2
          WHEN 'MOCK_PENDING' THEN 3
          WHEN 'SELECTED' THEN 4
          WHEN 'REJECTED' THEN 5
          ELSE 6
        END;
    `;
    const funnelRes = await db.query(funnelSql);

    // 3. Average attendance per batch (Document Section 6.4)
    const attendanceSql = `
      SELECT b.batch_code, ROUND(AVG(st.attendance_pct), 1) AS avg_attendance
      FROM student_stats st
      JOIN users u ON u.user_id = st.user_id
      JOIN batches b ON b.batch_id = u.batch_id
      GROUP BY b.batch_code
      ORDER BY b.batch_code;
    `;
    const attendanceRes = await db.query(attendanceSql);

    // 4. Most asked interview round types
    const interviewRoundsSql = `
      SELECT round_type, COUNT(*) AS count, ROUND(AVG(difficulty_rating), 1) AS avg_difficulty
      FROM interview_experiences
      GROUP BY round_type
      ORDER BY count DESC;
    `;
    const roundsRes = await db.query(interviewRoundsSql);

    // 5. Top companies hiring / with open drives
    const companiesSql = `
      SELECT company_name, COUNT(*) AS total_drives, MAX(package_lpa) AS max_package
      FROM job_requirements
      GROUP BY company_name
      ORDER BY total_drives DESC;
    `;
    const companiesRes = await db.query(companiesSql);

    // 6. Institute High-level KPIs
    const kpiSql = `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'STUDENT') AS total_students,
        (SELECT COUNT(*) FROM job_requirements) AS total_drives,
        (SELECT COUNT(*) FROM job_applications) AS total_applications,
        (SELECT COUNT(DISTINCT student_id) FROM job_applications WHERE status = 'SELECTED') AS total_placed_students,
        (SELECT ROUND(AVG(attendance_pct), 1) FROM student_stats) AS overall_attendance
    `;
    const kpiRes = await db.query(kpiSql);

    res.json({
      kpis: kpiRes.rows[0],
      placementsPerBatch: placementsRes.rows,
      applicationFunnel: funnelRes.rows,
      attendancePerBatch: attendanceRes.rows,
      interviewRounds: roundsRes.rows,
      topCompanies: companiesRes.rows,
      queries: {
        placementsSql: placementsSql.trim(),
        funnelSql: funnelSql.trim(),
        attendanceSql: attendanceSql.trim()
      }
    });
  } catch (err) {
    console.error('Analytics dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
