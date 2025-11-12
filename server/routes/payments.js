const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { body, validationResult } = require('express-validator');
const supabase = require('../config/database');
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
    const { data: paymentResult, error: insertError } = await supabase
      .from('payments')
      .insert({
        user_id: req.user.id,
        amount,
        currency,
        gateway: 'stripe',
        payment_type,
        status: 'pending',
        metadata: metadata
      })
      .select()
      .single();

    if (insertError) {
      console.error('Create payment error:', insertError);
      return res.status(500).json({ message: 'Server error creating payment' });
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: {
        payment_id: paymentResult.id.toString(),
        user_id: req.user.id.toString(),
        payment_type
      }
    });

    // Update payment with transaction ID
    await supabase
      .from('payments')
      .update({ transaction_id: paymentIntent.id })
      .eq('id', paymentResult.id);

    res.json({
      client_secret: paymentIntent.client_secret,
      payment_id: paymentResult.id
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
    const { data: payment, error: findError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', payment_id)
      .eq('user_id', req.user.id)
      .single();

    if (findError || !payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Verify with Stripe if gateway is Stripe
    if (payment.gateway === 'stripe') {
      const paymentIntent = await stripe.paymentIntents.retrieve(transaction_id);
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ message: 'Payment not completed' });
      }
    }

    // Update payment status
    await supabase
      .from('payments')
      .update({ status: 'completed' })
      .eq('id', payment_id);

    // Handle payment type specific logic
    if (payment.payment_type === 'ad_promotion') {
      const metadata = payment.metadata || {};
      if (metadata.ad_id) {
        await supabase
          .from('ads')
          .update({
            is_promoted: true,
            promotion_type: metadata.promotion_type || 'top_banner',
            promotion_expires_at: metadata.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          })
          .eq('id', metadata.ad_id)
          .eq('user_id', req.user.id);
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
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Get payment history error:', error);
      return res.status(500).json({ message: 'Server error' });
    }

    // Supabase automatically handles JSON fields
    const parsedPayments = (payments || []).map(payment => ({
      ...payment,
      metadata: payment.metadata || {}
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



