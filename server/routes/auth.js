const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

// Register a new student
router.post('/register', async (req, res) => {
  try {
    const { full_name, email, password, batch_id, cgpa, passout_year, skill_ids } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = await db.query('SELECT user_id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userRes = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, batch_id, cgpa, passout_year)
       VALUES ($1, $2, $3, 'STUDENT', $4, $5, $6)
       RETURNING user_id, full_name, email, role, batch_id, cgpa, passout_year, created_at`,
      [full_name, email.toLowerCase().trim(), passwordHash, batch_id || null, cgpa || 0, passout_year || null]
    );

    const newUser = userRes.rows[0];

    // Insert student skills if provided
    if (Array.isArray(skill_ids) && skill_ids.length > 0) {
      for (const skillId of skill_ids) {
        await db.query(
          `INSERT INTO student_skills (student_id, skill_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [newUser.user_id, skillId]
        );
      }
    }

    const token = jwt.sign(
      {
        userId: newUser.user_id,
        email: newUser.email,
        role: newUser.role,
        fullName: newUser.full_name,
        batchId: newUser.batch_id
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ user: newUser, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const userRes = await db.query(
      `SELECT u.*, b.batch_code, b.course_name 
       FROM users u
       LEFT JOIN batches b ON b.batch_id = u.batch_id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userRes.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      {
        userId: user.user_id,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        batchId: user.batch_id
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    delete user.password_hash;
    res.json({ user, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get current logged in user with stats
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userRes = await db.query(
      `SELECT u.user_id, u.full_name, u.email, u.role, u.batch_id, u.cgpa, u.passout_year, u.created_at,
              b.batch_code, b.course_name,
              s.attendance_pct, s.avg_mock_pct
       FROM users u
       LEFT JOIN batches b ON b.batch_id = u.batch_id
       LEFT JOIN student_stats s ON s.user_id = u.user_id
       WHERE u.user_id = $1`,
      [req.user.userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRes.rows[0];

    // Fetch skills
    const skillsRes = await db.query(
      `SELECT s.skill_id, s.name 
       FROM skills s
       JOIN student_skills ss ON ss.skill_id = s.skill_id
       WHERE ss.student_id = $1`,
      [req.user.userId]
    );
    user.skills = skillsRes.rows;

    res.json({ user });
  } catch (err) {
    console.error('Get /me error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get list of skills
router.get('/skills', async (req, res) => {
  try {
    const skillsRes = await db.query(`SELECT * FROM skills ORDER BY name ASC`);
    res.json({ skills: skillsRes.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get list of batches
router.get('/batches', async (req, res) => {
  try {
    const batchesRes = await db.query(`SELECT * FROM batches ORDER BY batch_code ASC`);
    res.json({ batches: batchesRes.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
