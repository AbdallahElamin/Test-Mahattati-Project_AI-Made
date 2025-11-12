const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/payments/create-intent
// @desc    Create payment intent (Stripe)
// @access  Private
router.post('/create-intent', authenticate, [
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
  body('payment_type').isIn(['ad_promotion', 'subscription', 'ad_upload']).withMessage('Invalid payment type'),
  body('currency').optional().isIn(['SAR', 'USD']).withMessage('Invalid currency')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, payment_type, currency = 'SAR', metadata = {} } = req.body;

    // Create payment record
    const [paymentResult] = await pool.execute(
      `INSERT INTO payments (user_id, amount, currency, gateway, payment_type, status, metadata) 
       VALUES (?, ?, ?, 'stripe', ?, 'pending', ?)`,
      [req.user.id, amount, currency, payment_type, JSON.stringify(metadata)]
    );

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: {
        payment_id: paymentResult.insertId.toString(),
        user_id: req.user.id.toString(),
        payment_type
      }
    });

    // Update payment with transaction ID
    await pool.execute(
      'UPDATE payments SET transaction_id = ? WHERE id = ?',
      [paymentIntent.id, paymentResult.insertId]
    );

    res.json({
      client_secret: paymentIntent.client_secret,
      payment_id: paymentResult.insertId
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ message: 'Server error creating payment' });
  }
});

// @route   POST /api/payments/confirm
// @desc    Confirm payment completion
// @access  Private
router.post('/confirm', authenticate, [
  body('payment_id').isInt().withMessage('Payment ID is required'),
  body('transaction_id').notEmpty().withMessage('Transaction ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { payment_id, transaction_id } = req.body;

    // Verify payment belongs to user
    const [payments] = await pool.execute(
      'SELECT * FROM payments WHERE id = ? AND user_id = ?',
      [payment_id, req.user.id]
    );

    if (payments.length === 0) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const payment = payments[0];

    // Verify with Stripe if gateway is Stripe
    if (payment.gateway === 'stripe') {
      const paymentIntent = await stripe.paymentIntents.retrieve(transaction_id);
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ message: 'Payment not completed' });
      }
    }

    // Update payment status
    await pool.execute(
      'UPDATE payments SET status = ? WHERE id = ?',
      ['completed', payment_id]
    );

    // Handle payment type specific logic
    if (payment.payment_type === 'ad_promotion') {
      const metadata = JSON.parse(payment.metadata || '{}');
      if (metadata.ad_id) {
        await pool.execute(
          `UPDATE ads SET is_promoted = TRUE, promotion_type = ?, promotion_expires_at = ? 
           WHERE id = ? AND user_id = ?`,
          [
            metadata.promotion_type || 'top_banner',
            metadata.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            metadata.ad_id,
            req.user.id
          ]
        );
      }
    }

    res.json({ message: 'Payment confirmed successfully' });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ message: 'Server error confirming payment' });
  }
});

// @route   GET /api/payments/history
// @desc    Get payment history
// @access  Private
router.get('/history', authenticate, async (req, res) => {
  try {
    const [payments] = await pool.execute(
      'SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );

    const parsedPayments = payments.map(payment => ({
      ...payment,
      metadata: payment.metadata ? JSON.parse(payment.metadata) : {}
    }));

    res.json({ payments: parsedPayments });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mada payment endpoint (placeholder - implement according to Mada API documentation)
router.post('/mada', authenticate, [
  body('amount').isFloat({ min: 0.01 }),
  body('payment_type').isIn(['ad_promotion', 'subscription', 'ad_upload'])
], async (req, res) => {
  try {
    // Mada integration would go here
    // This is a placeholder - implement according to Mada API documentation
    res.status(501).json({ message: 'Mada integration pending' });
  } catch (error) {
    console.error('Mada payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;



