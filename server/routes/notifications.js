const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/notifications (Fetch current user's notifications)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const notifs = await db.query(
      `SELECT n.*, j.company_name, j.job_profile 
       FROM notifications n
       LEFT JOIN job_requirements j ON j.job_id = n.job_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [req.user.userId]
    );

    const unreadCountRes = await db.query(
      `SELECT COUNT(*) AS unread_count 
       FROM notifications 
       WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.userId]
    );

    res.json({
      notifications: notifs.rows,
      unreadCount: parseInt(unreadCountRes.rows[0]?.unread_count || 0)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notifications/:id/read (Mark a single notification as read)
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const notifId = parseInt(req.params.id);
    const updateRes = await db.query(
      `UPDATE notifications 
       SET is_read = TRUE 
       WHERE notification_id = $1 AND user_id = $2
       RETURNING *`,
      [notifId, req.user.userId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ notification: updateRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notifications/read-all (Mark all notifications for user as read)
router.patch('/read-all', authenticateToken, async (req, res) => {
  try {
    await db.query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.userId]
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/:id/read-stats (HR Read Tracking - Document Section 6.4 query)
router.get('/jobs/:id/read-stats', authenticateToken, requireRole('HR', 'ADMIN', 'TRAINER'), async (req, res) => {
  try {
    const jobId = parseInt(req.params.id);

    // SQL query from Project Document Section 6.4:
    // Who has not opened a job notification yet (HR read tracking)
    const readAuditSql = `
      SELECT u.user_id, u.full_name, u.email, n.is_read, n.created_at,
             b.batch_code
      FROM notifications n 
      JOIN users u ON u.user_id = n.user_id
      LEFT JOIN batches b ON b.batch_id = u.batch_id
      WHERE n.job_id = $1
      ORDER BY n.is_read ASC, u.full_name ASC
    `;

    const result = await db.query(readAuditSql, [jobId]);
    const recipients = result.rows;

    const totalNotified = recipients.length;
    const openedCount = recipients.filter(r => r.is_read).length;
    const unreadCount = totalNotified - openedCount;
    const openRate = totalNotified > 0 ? Math.round((openedCount / totalNotified) * 100) : 0;

    res.json({
      jobId,
      totalNotified,
      openedCount,
      unreadCount,
      openRate,
      recipients,
      sqlQuery: `SELECT u.full_name FROM notifications n JOIN users u ON u.user_id = n.user_id WHERE n.job_id = $1 AND n.is_read = FALSE;`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
