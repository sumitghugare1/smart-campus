const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/messages (Batch group messages)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const batchId = req.query.batch_id || req.user.batchId;

    if (!batchId) {
      return res.status(400).json({ error: 'batch_id query parameter is required' });
    }

    const messagesRes = await db.query(
      `SELECT m.message_id, m.sender_id, m.batch_id, m.receiver_id, m.body, m.created_at,
              u.full_name AS sender_name, u.role AS sender_role, u.email AS sender_email
       FROM messages m
       JOIN users u ON u.user_id = m.sender_id
       WHERE m.batch_id = $1
       ORDER BY m.created_at ASC
       LIMIT 100`,
      [batchId]
    );

    res.json({ messages: messagesRes.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/dm/:userId (Direct messages between current user and another user)
router.get('/dm/:userId', authenticateToken, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId);
    const myId = req.user.userId;

    const messagesRes = await db.query(
      `SELECT m.message_id, m.sender_id, m.batch_id, m.receiver_id, m.body, m.created_at,
              u.full_name AS sender_name, u.role AS sender_role
       FROM messages m
       JOIN users u ON u.user_id = m.sender_id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2)
          OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at ASC
       LIMIT 100`,
      [myId, targetUserId]
    );

    res.json({ messages: messagesRes.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages (Send batch or direct message)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { batch_id, receiver_id, body } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Message body cannot be empty' });
    }

    if ((batch_id && receiver_id) || (!batch_id && !receiver_id)) {
      return res.status(400).json({ error: 'Must specify either batch_id OR receiver_id (not both)' });
    }

    const insertRes = await db.query(
      `INSERT INTO messages (sender_id, batch_id, receiver_id, body)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.userId, batch_id || null, receiver_id || null, body.trim()]
    );

    const newMsg = insertRes.rows[0];
    newMsg.sender_name = req.user.fullName;
    newMsg.sender_role = req.user.role;

    res.status(201).json({ message: newMsg });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/contacts (List available trainers/students for direct messaging)
router.get('/contacts', authenticateToken, async (req, res) => {
  try {
    const currentRole = req.user.role;
    let query = '';
    let params = [];

    if (currentRole === 'STUDENT') {
      // Students can message Trainers and HR
      query = `SELECT user_id, full_name, email, role FROM users WHERE role IN ('TRAINER', 'HR') ORDER BY role, full_name`;
    } else {
      // Trainers and HR can message Students in their batch or all students
      query = `SELECT u.user_id, u.full_name, u.email, u.role, b.batch_code 
               FROM users u 
               LEFT JOIN batches b ON b.batch_id = u.batch_id 
               WHERE u.user_id != $1 
               ORDER BY u.role, u.full_name`;
      params = [req.user.userId];
    }

    const contactsRes = await db.query(query, params);
    res.json({ contacts: contactsRes.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
