const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

// GET /api/resources (List resources with optional category & batch filtering)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, batch_id, search } = req.query;
    let query = `
      SELECT r.*, u.full_name AS trainer_name, b.batch_code
      FROM batch_resources r
      JOIN users u ON u.user_id = r.trainer_id
      JOIN batches b ON b.batch_id = r.batch_id
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      params.push(category);
      query += ` AND r.category = $${params.length}`;
    }

    if (batch_id) {
      params.push(batch_id);
      query += ` AND r.batch_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (r.title ILIKE $${params.length} OR r.category ILIKE $${params.length})`;
    }

    query += ` ORDER BY r.created_at DESC`;

    const resourcesRes = await db.query(query, params);
    res.json({ resources: resourcesRes.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/resources (Trainers/Admin upload PDF / study material)
router.post('/', authenticateToken, requireRole('TRAINER', 'ADMIN'), upload.single('file'), async (req, res) => {
  try {
    const { title, category, batch_id } = req.body;

    if (!title || !category || !batch_id) {
      return res.status(400).json({ error: 'Title, category, and batch_id are required' });
    }

    if (req.user.role === 'TRAINER') {
      const access = await db.query(
        `SELECT 1 FROM batch_trainers WHERE trainer_id = $1 AND batch_id = $2 LIMIT 1`,
        [req.user.userId, batch_id]
      );
      if (access.rows.length === 0) {
        return res.status(403).json({ error: 'You are not assigned to this batch. Ask your Manager for access.' });
      }
    }

    let fileUrl = '';
    if (req.file) {
      fileUrl = `uploads/${req.file.filename}`;
    } else if (req.body.file_url) {
      fileUrl = req.body.file_url;
    } else {
      return res.status(400).json({ error: 'File or file URL is required' });
    }

    const assignedBatchId = batch_id;

    const insertRes = await db.query(
      `INSERT INTO batch_resources (batch_id, trainer_id, title, file_url, category)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [assignedBatchId, req.user.userId, title, fileUrl, category]
    );

    res.status(201).json({
      message: 'Resource uploaded successfully',
      resource: insertRes.rows[0]
    });
  } catch (err) {
    console.error('Resource upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/resources/categories
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`SELECT DISTINCT category FROM batch_resources ORDER BY category ASC`);
    const defaultCategories = ['Database & SQL', 'Frontend', 'Backend & Node', 'Aptitude & Reasoning', 'System Design'];
    const existing = result.rows.map(r => r.category);
    const combined = Array.from(new Set([...defaultCategories, ...existing]));
    res.json({ categories: combined });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
