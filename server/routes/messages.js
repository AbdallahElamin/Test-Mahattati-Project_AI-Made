const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/messages
// @desc    Send a message
// @access  Private
router.post('/', authenticate, [
  body('receiver_id').isInt().withMessage('Receiver ID is required'),
  body('content').trim().notEmpty().withMessage('Message content is required'),
  body('ad_id').optional().isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { receiver_id, content, ad_id } = req.body;

    // Check if receiver exists
    const [receivers] = await pool.execute('SELECT id FROM users WHERE id = ?', [receiver_id]);
    if (receivers.length === 0) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    // Insert message
    const [result] = await pool.execute(
      'INSERT INTO messages (sender_id, receiver_id, ad_id, content) VALUES (?, ?, ?, ?)',
      [req.user.id, receiver_id, ad_id || null, content]
    );

    // Create notification for receiver
    await pool.execute(
      `INSERT INTO notifications (user_id, type, title, title_ar, message, message_ar, link_url) 
       VALUES (?, 'message', 'New Message', 'رسالة جديدة', ?, ?, ?)`,
      [
        receiver_id,
        `You have a new message from ${req.user.name}`,
        `لديك رسالة جديدة من ${req.user.name}`,
        `/messages/${result.insertId}`
      ]
    );

    const [message] = await pool.execute('SELECT * FROM messages WHERE id = ?', [result.insertId]);

    res.status(201).json({ message: message[0] });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/messages
// @desc    Get user's conversations
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const [conversations] = await pool.execute(
      `SELECT DISTINCT 
        CASE 
          WHEN sender_id = ? THEN receiver_id 
          ELSE sender_id 
        END as other_user_id,
        u.name as other_user_name,
        u.profile_image as other_user_image,
        (SELECT content FROM messages m2 
         WHERE (m2.sender_id = ? AND m2.receiver_id = other_user_id) 
            OR (m2.sender_id = other_user_id AND m2.receiver_id = ?)
         ORDER BY m2.created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages m2 
         WHERE (m2.sender_id = ? AND m2.receiver_id = other_user_id) 
            OR (m2.sender_id = other_user_id AND m2.receiver_id = ?)
         ORDER BY m2.created_at DESC LIMIT 1) as last_message_time,
        (SELECT COUNT(*) FROM messages m2 
         WHERE m2.receiver_id = ? AND m2.sender_id = other_user_id AND m2.is_read = FALSE) as unread_count
       FROM messages m
       JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
       WHERE m.sender_id = ? OR m.receiver_id = ?
       GROUP BY other_user_id, u.name, u.profile_image
       ORDER BY last_message_time DESC`,
      [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id]
    );

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/messages/:userId
// @desc    Get messages with a specific user
// @access  Private
router.get('/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    const [messages] = await pool.execute(
      `SELECT m.*, 
        u1.name as sender_name, u1.profile_image as sender_image,
        u2.name as receiver_name, u2.profile_image as receiver_image
       FROM messages m
       JOIN users u1 ON m.sender_id = u1.id
       JOIN users u2 ON m.receiver_id = u2.id
       WHERE (m.sender_id = ? AND m.receiver_id = ?) 
          OR (m.sender_id = ? AND m.receiver_id = ?)
       ORDER BY m.created_at ASC`,
      [req.user.id, userId, userId, req.user.id]
    );

    // Mark messages as read
    await pool.execute(
      'UPDATE messages SET is_read = TRUE WHERE receiver_id = ? AND sender_id = ? AND is_read = FALSE',
      [req.user.id, userId]
    );

    res.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;



