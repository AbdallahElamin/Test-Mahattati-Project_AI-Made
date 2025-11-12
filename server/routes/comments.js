const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/comments
// @desc    Add a comment to an ad
// @access  Private
router.post('/', authenticate, [
  body('ad_id').isInt().withMessage('Ad ID is required'),
  body('content').trim().notEmpty().withMessage('Comment content is required'),
  body('parent_id').optional().isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { ad_id, content, parent_id } = req.body;

    // Verify ad exists
    const [ads] = await pool.execute('SELECT user_id FROM ads WHERE id = ?', [ad_id]);
    if (ads.length === 0) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    const [result] = await pool.execute(
      'INSERT INTO comments (ad_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)',
      [ad_id, req.user.id, content, parent_id || null]
    );

    // Notify ad owner
    if (ads[0].user_id !== req.user.id) {
      await pool.execute(
        `INSERT INTO notifications (user_id, type, title, title_ar, message, message_ar, link_url) 
         VALUES (?, 'comment', 'New Comment', 'تعليق جديد', ?, ?, ?)`,
        [
          ads[0].user_id,
          `${req.user.name} commented on your ad`,
          `علق ${req.user.name} على إعلانك`,
          `/ads/${ad_id}`
        ]
      );
    }

    const [comment] = await pool.execute(
      `SELECT c.*, u.name as user_name, u.profile_image 
       FROM comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ comment: comment[0] });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/comments/:adId
// @desc    Get comments for an ad
// @access  Private
router.get('/:adId', authenticate, async (req, res) => {
  try {
    const { adId } = req.params;

    const [comments] = await pool.execute(
      `SELECT c.*, u.name as user_name, u.profile_image 
       FROM comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.ad_id = ? 
       ORDER BY c.created_at ASC`,
      [adId]
    );

    res.json({ comments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;



