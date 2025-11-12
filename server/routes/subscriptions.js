const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/subscriptions/status
// @desc    Get current subscription status
// @access  Private (Subscriber)
router.get('/status', authenticate, authorize('subscriber'), async (req, res) => {
  try {
    const [subscriptions] = await pool.execute(
      `SELECT * FROM subscriptions 
       WHERE user_id = ? AND payment_status = 'paid' 
       AND end_date >= CURDATE() 
       ORDER BY end_date DESC LIMIT 1`,
      [req.user.id]
    );

    if (subscriptions.length === 0) {
      return res.json({ 
        active: false, 
        message: 'No active subscription found' 
      });
    }

    res.json({ 
      active: true, 
      subscription: subscriptions[0] 
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/subscriptions/create
// @desc    Create a new subscription (after payment)
// @access  Private (Subscriber)
router.post('/create', authenticate, authorize('subscriber'), [
  body('payment_id').isInt().withMessage('Payment ID is required'),
  body('type').isIn(['monthly']).withMessage('Invalid subscription type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { payment_id, type } = req.body;

    // Verify payment
    const [payments] = await pool.execute(
      'SELECT id, status FROM payments WHERE id = ? AND user_id = ? AND payment_type = ?',
      [payment_id, req.user.id, 'subscription']
    );

    if (payments.length === 0 || payments[0].status !== 'completed') {
      return res.status(400).json({ message: 'Invalid or incomplete payment' });
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    // Create subscription
    const [result] = await pool.execute(
      `INSERT INTO subscriptions (user_id, type, start_date, end_date, payment_status, payment_id) 
       VALUES (?, ?, ?, ?, 'paid', ?)`,
      [req.user.id, type, startDate, endDate, payment_id]
    );

    const [subscription] = await pool.execute(
      'SELECT * FROM subscriptions WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ subscription: subscription[0] });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/subscriptions/history
// @desc    Get subscription history
// @access  Private (Subscriber)
router.get('/history', authenticate, authorize('subscriber'), async (req, res) => {
  try {
    const [subscriptions] = await pool.execute(
      'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    res.json({ subscriptions });
  } catch (error) {
    console.error('Get subscription history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;



