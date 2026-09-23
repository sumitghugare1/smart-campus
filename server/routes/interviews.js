const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/interviews (Searchable interview repository)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { company, round, difficulty, search } = req.query;

    let query = `
      SELECT ie.*, u.full_name AS student_name, b.batch_code
      FROM interview_experiences ie
      JOIN users u ON u.user_id = ie.student_id
      LEFT JOIN batches b ON b.batch_id = u.batch_id
      WHERE 1=1
    `;
    const params = [];

    if (company) {
      params.push(`%${company}%`);
      query += ` AND ie.company_name ILIKE $${params.length}`;
    }

    if (round) {
      params.push(round);
      query += ` AND ie.round_type = $${params.length}`;
    }

    if (difficulty) {
      params.push(parseInt(difficulty));
      query += ` AND ie.difficulty_rating = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (ie.questions_text ILIKE $${params.length} OR ie.job_role ILIKE $${params.length} OR ie.company_name ILIKE $${params.length})`;
    }

    query += ` ORDER BY ie.created_at DESC`;

    const result = await db.query(query, params);
    res.json({ experiences: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/interviews (Student shares an interview experience)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { company_name, job_role, round_type, questions_text, difficulty_rating } = req.body;

    if (!company_name || !round_type || !questions_text) {
      return res.status(400).json({ error: 'Company name, round type, and questions are required' });
    }

    const rating = Math.min(Math.max(parseInt(difficulty_rating) || 3, 1), 5);

    const insertRes = await db.query(
      `INSERT INTO interview_experiences 
       (student_id, company_name, job_role, round_type, questions_text, difficulty_rating)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.userId, company_name, job_role || 'Software Engineer', round_type, questions_text, rating]
    );

    res.status(201).json({
      message: 'Interview experience shared successfully',
      experience: insertRes.rows[0]
    });
  } catch (err) {
    console.error('Interview share error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/interviews/metadata (Unique companies and round types)
router.get('/metadata', authenticateToken, async (req, res) => {
  try {
    const companiesRes = await db.query(`SELECT DISTINCT company_name FROM interview_experiences ORDER BY company_name ASC`);
    const roundsRes = await db.query(`SELECT DISTINCT round_type FROM interview_experiences ORDER BY round_type ASC`);

    const defaultRounds = ['Online Assessment / Coding', 'Technical Round 1', 'Technical Round 2', 'System Design', 'HR / Managerial'];
    const existingRounds = roundsRes.rows.map(r => r.round_type);
    const combinedRounds = Array.from(new Set([...defaultRounds, ...existingRounds]));

    res.json({
      companies: companiesRes.rows.map(r => r.company_name),
      rounds: combinedRounds
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
