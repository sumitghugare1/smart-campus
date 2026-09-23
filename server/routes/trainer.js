const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Helper: confirm a trainer is assigned to a batch (ADMIN/MANAGER bypass the check)
async function assertTrainerHasBatchAccess(req, batchId) {
  if (['ADMIN', 'MANAGER'].includes(req.user.role)) return true;
  const check = await db.query(
    `SELECT 1 FROM batch_trainers WHERE trainer_id = $1 AND batch_id = $2 LIMIT 1`,
    [req.user.userId, batchId]
  );
  return check.rows.length > 0;
}

// GET /api/trainer/my-batches (Batches this trainer has been assigned to by a Manager)
router.get('/my-batches', authenticateToken, requireRole('TRAINER', 'ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const isPrivileged = ['ADMIN', 'MANAGER'].includes(req.user.role);
    const result = await db.query(
      isPrivileged
        ? `SELECT DISTINCT b.batch_id, b.batch_code, b.course_name, b.start_date
           FROM batches b ORDER BY b.batch_code ASC`
        : `SELECT b.batch_id, b.batch_code, b.course_name, b.start_date,
                  json_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL) AS subjects
           FROM batch_trainers bt
           JOIN batches b ON b.batch_id = bt.batch_id
           LEFT JOIN subjects s ON s.subject_id = bt.subject_id
           WHERE bt.trainer_id = $1
           GROUP BY b.batch_id, b.batch_code, b.course_name, b.start_date
           ORDER BY b.batch_code ASC`,
      isPrivileged ? [] : [req.user.userId]
    );
    res.json({ batches: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/trainer/attendance (Mark attendance for students in an assigned batch)
router.post('/attendance', authenticateToken, requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    const { session_date, batch_id, records } = req.body;
    // records: [ { student_id, present: true/false } ]

    if (!session_date || !batch_id || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'session_date, batch_id, and records array are required' });
    }

    if (!(await assertTrainerHasBatchAccess(req, batch_id))) {
      return res.status(403).json({ error: 'You are not assigned to this batch. Ask your Manager for access.' });
    }

    let savedCount = 0;
    for (const rec of records) {
      await db.query(
        `INSERT INTO attendance (student_id, batch_id, session_date, present)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (student_id, session_date)
         DO UPDATE SET present = EXCLUDED.present, batch_id = EXCLUDED.batch_id`,
        [rec.student_id, batch_id, session_date, Boolean(rec.present)]
      );
      savedCount++;
    }

    res.json({ message: `Attendance marked for ${savedCount} students on ${session_date}` });
  } catch (err) {
    console.error('Attendance marking error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/trainer/mocks (Record mock interview scores)
router.post('/mocks', authenticateToken, requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    const { student_id, subject, score, max_score, conducted_on } = req.body;

    if (!student_id || !subject || score === undefined) {
      return res.status(400).json({ error: 'student_id, subject, and score are required' });
    }

    if (req.user.role === 'TRAINER') {
      const student = await db.query(
        `SELECT batch_id FROM users WHERE user_id = $1 AND role = 'STUDENT'`,
        [student_id]
      );
      if (student.rows.length === 0) {
        return res.status(404).json({ error: 'Student not found' });
      }
      if (!(await assertTrainerHasBatchAccess(req, student.rows[0].batch_id))) {
        return res.status(403).json({ error: 'You are not assigned to this student\'s batch.' });
      }
    }

    const insertRes = await db.query(
      `INSERT INTO mock_scores (student_id, trainer_id, subject, score, max_score, conducted_on)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        student_id,
        req.user.userId,
        subject,
        parseInt(score),
        parseInt(max_score || 100),
        conducted_on || new Date().toISOString().split('T')[0]
      ]
    );

    // Notify student about new mock evaluation
    await db.query(
      `INSERT INTO notifications (user_id, type, title, body, is_read)
       VALUES ($1, 'MOCK_SCORE', $2, $3, FALSE)`,
      [
        student_id,
        `New Mock Score: ${subject} (${score}/${max_score || 100})`,
        `Trainer ${req.user.fullName} published your evaluation score for ${subject}.`
      ]
    );

    res.status(201).json({
      message: 'Mock score recorded successfully',
      mockScore: insertRes.rows[0]
    });
  } catch (err) {
    console.error('Mock score error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trainer/batches/:id/readiness (Batch readiness view & at-risk flags)
router.get('/batches/:id/readiness', authenticateToken, requireRole('TRAINER', 'ADMIN', 'HR', 'MANAGER'), async (req, res) => {
  try {
    const batchId = parseInt(req.params.id);

    if (req.user.role === 'TRAINER' && !(await assertTrainerHasBatchAccess(req, batchId))) {
      return res.status(403).json({ error: 'You are not assigned to this batch.' });
    }

    const studentsRes = await db.query(
      `SELECT 
         u.user_id, u.full_name, u.email, u.cgpa, u.passout_year,
         b.batch_code, b.course_name,
         s.attendance_pct, s.avg_mock_pct,
         (s.attendance_pct < 75 OR s.avg_mock_pct < 60) AS is_at_risk,
         COALESCE(
           (SELECT json_agg(sk.name)
            FROM student_skills ss
            JOIN skills sk ON sk.skill_id = ss.skill_id
            WHERE ss.student_id = u.user_id), '[]'::json
         ) AS skills,
         (SELECT COUNT(*) FROM job_applications ja WHERE ja.student_id = u.user_id) AS applications_count,
         (SELECT COUNT(*) FROM job_applications ja WHERE ja.student_id = u.user_id AND ja.status = 'SELECTED') AS placed_count
       FROM users u
       JOIN batches b ON b.batch_id = u.batch_id
       LEFT JOIN student_stats s ON s.user_id = u.user_id
       WHERE u.batch_id = $1 AND u.role = 'STUDENT'
       ORDER BY (s.attendance_pct < 75 OR s.avg_mock_pct < 60) DESC, u.full_name ASC`,
      [batchId]
    );

    const students = studentsRes.rows;
    const totalStudents = students.length;
    const atRiskCount = students.filter(s => s.is_at_risk).length;
    const avgAttendance = totalStudents > 0
      ? (students.reduce((acc, cur) => acc + parseFloat(cur.attendance_pct || 0), 0) / totalStudents).toFixed(1)
      : 0;
    const avgMock = totalStudents > 0
      ? (students.reduce((acc, cur) => acc + parseFloat(cur.avg_mock_pct || 0), 0) / totalStudents).toFixed(1)
      : 0;

    res.json({
      batchId,
      totalStudents,
      atRiskCount,
      avgAttendance,
      avgMock,
      students
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trainer/batches/:id/students (Get students in a batch for attendance marking)
router.get('/batches/:id/students', authenticateToken, requireRole('TRAINER', 'ADMIN'), async (req, res) => {
  try {
    const batchId = parseInt(req.params.id);
    const date = req.query.date || new Date().toISOString().split('T')[0];

    if (req.user.role === 'TRAINER' && !(await assertTrainerHasBatchAccess(req, batchId))) {
      return res.status(403).json({ error: 'You are not assigned to this batch.' });
    }

    const result = await db.query(
      `SELECT 
         u.user_id, u.full_name, u.email,
         COALESCE(a.present, true) AS present,
         s.attendance_pct, s.avg_mock_pct
       FROM users u
       LEFT JOIN attendance a ON a.student_id = u.user_id AND a.session_date = $2
       LEFT JOIN student_stats s ON s.user_id = u.user_id
       WHERE u.batch_id = $1 AND u.role = 'STUDENT'
       ORDER BY u.full_name ASC`,
      [batchId, date]
    );

    res.json({ students: result.rows, date });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
