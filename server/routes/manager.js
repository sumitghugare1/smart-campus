const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All routes in this file are Manager (and Admin) only
router.use(authenticateToken, requireRole('MANAGER', 'ADMIN'));

// GET /api/manager/overview - high level counts for the manager dashboard
router.get('/overview', async (req, res) => {
  try {
    const [batches, trainers, hrs, students, subjects, assignments] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM batches`),
      db.query(`SELECT COUNT(*) FROM users WHERE role = 'TRAINER'`),
      db.query(`SELECT COUNT(*) FROM users WHERE role = 'HR'`),
      db.query(`SELECT COUNT(*) FROM users WHERE role = 'STUDENT'`),
      db.query(`SELECT COUNT(*) FROM subjects`),
      db.query(`SELECT COUNT(*) FROM batch_trainers`),
    ]);

    const unassigned = await db.query(`
      SELECT b.batch_id, b.batch_code, b.course_name
      FROM batches b
      WHERE NOT EXISTS (SELECT 1 FROM batch_trainers bt WHERE bt.batch_id = b.batch_id)
      ORDER BY b.batch_code ASC
    `);

    res.json({
      totalBatches: parseInt(batches.rows[0].count),
      totalTrainers: parseInt(trainers.rows[0].count),
      totalHr: parseInt(hrs.rows[0].count),
      totalStudents: parseInt(students.rows[0].count),
      totalSubjects: parseInt(subjects.rows[0].count),
      totalAssignments: parseInt(assignments.rows[0].count),
      unassignedBatches: unassigned.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/manager/batches - batches with student counts and assigned trainers
router.get('/batches', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        b.batch_id, b.batch_code, b.course_name, b.start_date,
        (SELECT COUNT(*) FROM users u WHERE u.batch_id = b.batch_id AND u.role = 'STUDENT') AS student_count,
        COALESCE(
          (SELECT json_agg(json_build_object(
             'assignment_id', bt.assignment_id,
             'trainer_id', t.user_id,
             'trainer_name', t.full_name,
             'subject_id', s.subject_id,
             'subject_name', s.name
           ) ORDER BY t.full_name)
           FROM batch_trainers bt
           JOIN users t ON t.user_id = bt.trainer_id
           LEFT JOIN subjects s ON s.subject_id = bt.subject_id
           WHERE bt.batch_id = b.batch_id), '[]'::json
        ) AS trainers
      FROM batches b
      ORDER BY b.batch_code ASC
    `);
    res.json({ batches: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/manager/batches - create a new batch
router.post('/batches', async (req, res) => {
  try {
    const { batch_code, course_name, start_date } = req.body;
    if (!batch_code || !course_name) {
      return res.status(400).json({ error: 'batch_code and course_name are required' });
    }

    const existing = await db.query(`SELECT batch_id FROM batches WHERE batch_code = $1`, [batch_code.trim()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'A batch with this code already exists' });
    }

    const result = await db.query(
      `INSERT INTO batches (batch_code, course_name, start_date) VALUES ($1, $2, $3) RETURNING *`,
      [batch_code.trim(), course_name.trim(), start_date || null]
    );
    res.status(201).json({ batch: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/manager/subjects
router.get('/subjects', async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM subjects ORDER BY name ASC`);
    res.json({ subjects: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/manager/subjects - add a new subject
router.post('/subjects', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Subject name is required' });
    }
    const existing = await db.query(`SELECT subject_id FROM subjects WHERE LOWER(name) = LOWER($1)`, [name.trim()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'This subject already exists' });
    }
    const result = await db.query(`INSERT INTO subjects (name) VALUES ($1) RETURNING *`, [name.trim()]);
    res.status(201).json({ subject: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/manager/staff?role=TRAINER|HR - list trainers/HRs with their batch assignments
router.get('/staff', async (req, res) => {
  try {
    const { role } = req.query;
    const params = [];
    let where = `u.role IN ('TRAINER','HR')`;
    if (role) {
      params.push(role.toUpperCase());
      where = `u.role = $1`;
    }

    const result = await db.query(
      `SELECT
         u.user_id, u.full_name, u.email, u.role, u.created_at,
         COALESCE(
           (SELECT json_agg(json_build_object(
              'assignment_id', bt.assignment_id,
              'batch_id', b.batch_id,
              'batch_code', b.batch_code,
              'subject_name', s.name
            ))
            FROM batch_trainers bt
            JOIN batches b ON b.batch_id = bt.batch_id
            LEFT JOIN subjects s ON s.subject_id = bt.subject_id
            WHERE bt.trainer_id = u.user_id), '[]'::json
         ) AS assigned_batches
       FROM users u
       WHERE ${where}
       ORDER BY u.role ASC, u.full_name ASC`,
      params
    );
    res.json({ staff: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/manager/staff - create a new Trainer or HR account
router.post('/staff', async (req, res) => {
  try {
    const { full_name, email, password, role } = req.body;
    if (!full_name || !email || !password || !role) {
      return res.status(400).json({ error: 'full_name, email, password, and role are required' });
    }
    const normalizedRole = role.toUpperCase();
    if (!['TRAINER', 'HR'].includes(normalizedRole)) {
      return res.status(400).json({ error: 'role must be TRAINER or HR' });
    }

    const existing = await db.query(`SELECT user_id FROM users WHERE email = $1`, [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, full_name, email, role, created_at`,
      [full_name.trim(), email.toLowerCase().trim(), passwordHash, normalizedRole]
    );
    res.status(201).json({ staff: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/manager/batch-trainers - assign a trainer to a batch (grants trainer access to that batch)
router.post('/batch-trainers', async (req, res) => {
  try {
    const { batch_id, trainer_id, subject_id } = req.body;
    if (!batch_id || !trainer_id) {
      return res.status(400).json({ error: 'batch_id and trainer_id are required' });
    }

    const trainerCheck = await db.query(`SELECT role FROM users WHERE user_id = $1`, [trainer_id]);
    if (trainerCheck.rows.length === 0 || trainerCheck.rows[0].role !== 'TRAINER') {
      return res.status(400).json({ error: 'trainer_id must reference an existing Trainer account' });
    }

    const result = await db.query(
      `INSERT INTO batch_trainers (batch_id, trainer_id, subject_id, assigned_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (batch_id, trainer_id, subject_id) DO NOTHING
       RETURNING *`,
      [batch_id, trainer_id, subject_id || null, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'This trainer is already assigned to this batch/subject' });
    }

    // Notify the trainer they now have access to this batch
    const batchInfo = await db.query(`SELECT batch_code, course_name FROM batches WHERE batch_id = $1`, [batch_id]);
    await db.query(
      `INSERT INTO notifications (user_id, type, title, body, is_read)
       VALUES ($1, 'BATCH_ASSIGNED', $2, $3, FALSE)`,
      [
        trainer_id,
        `New Batch Assigned: ${batchInfo.rows[0]?.batch_code || ''}`,
        `You now have access to ${batchInfo.rows[0]?.course_name || 'a new batch'}. You can mark attendance, submit mock scores, and upload resources for it.`
      ]
    );

    res.status(201).json({ assignment: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/manager/batch-trainers/:id - revoke a trainer's access to a batch
router.delete('/batch-trainers/:id', async (req, res) => {
  try {
    const result = await db.query(`DELETE FROM batch_trainers WHERE assignment_id = $1 RETURNING *`, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json({ message: 'Trainer access revoked', assignment: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/manager/students?batch_id= - list students, optionally filtered by batch
router.get('/students', async (req, res) => {
  try {
    const { batch_id } = req.query;
    const params = [];
    let where = `u.role = 'STUDENT'`;
    if (batch_id) {
      params.push(batch_id);
      where += ` AND u.batch_id = $1`;
    }

    const result = await db.query(
      `SELECT u.user_id, u.full_name, u.email, u.cgpa, u.passout_year, u.batch_id,
              b.batch_code, b.course_name
       FROM users u
       LEFT JOIN batches b ON b.batch_id = u.batch_id
       WHERE ${where}
       ORDER BY u.full_name ASC`,
      params
    );
    res.json({ students: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/manager/students - add a new student directly into a batch, or an existing student (email match) to a batch
router.post('/students', async (req, res) => {
  try {
    const { full_name, email, password, batch_id, cgpa, passout_year, skill_ids } = req.body;
    if (!email || !batch_id) {
      return res.status(400).json({ error: 'email and batch_id are required' });
    }

    const existing = await db.query(`SELECT user_id, role FROM users WHERE email = $1`, [email.toLowerCase().trim()]);

    if (existing.rows.length > 0) {
      // Existing student: just move/assign them into this batch
      if (existing.rows[0].role !== 'STUDENT') {
        return res.status(400).json({ error: 'This email belongs to a non-student account' });
      }
      const updated = await db.query(
        `UPDATE users SET batch_id = $1 WHERE user_id = $2 RETURNING user_id, full_name, email, batch_id`,
        [batch_id, existing.rows[0].user_id]
      );
      return res.status(200).json({ student: updated.rows[0], created: false });
    }

    if (!full_name || !password) {
      return res.status(400).json({ error: 'full_name and password are required to create a new student' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, batch_id, cgpa, passout_year)
       VALUES ($1, $2, $3, 'STUDENT', $4, $5, $6)
       RETURNING user_id, full_name, email, batch_id, cgpa, passout_year`,
      [full_name.trim(), email.toLowerCase().trim(), passwordHash, batch_id, cgpa || 0, passout_year || null]
    );

    const newStudent = result.rows[0];
    if (Array.isArray(skill_ids) && skill_ids.length > 0) {
      for (const skillId of skill_ids) {
        await db.query(
          `INSERT INTO student_skills (student_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [newStudent.user_id, skillId]
        );
      }
    }

    res.status(201).json({ student: newStudent, created: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/manager/students/:id/batch - move a student to a different batch
router.patch('/students/:id/batch', async (req, res) => {
  try {
    const { batch_id } = req.body;
    if (!batch_id) {
      return res.status(400).json({ error: 'batch_id is required' });
    }
    const result = await db.query(
      `UPDATE users SET batch_id = $1 WHERE user_id = $2 AND role = 'STUDENT' RETURNING user_id, full_name, email, batch_id`,
      [batch_id, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json({ student: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
