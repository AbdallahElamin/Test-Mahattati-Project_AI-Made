const express = require('express');
const { body, validationResult } = require('express-validator');
const supabase = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/subscriptions/status
// @desc    Get current subscription status
// @access  Private (Subscriber)
router.get('/status', authenticate, authorize('subscriber'), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('payment_status', 'paid')
      .gte('end_date', today)
      .order('end_date', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Get subscription error:', error);
      return res.status(500).json({ message: 'Server error' });
    }

    if (!subscriptions || subscriptions.length === 0) {
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
    const { data: payment, error: findError } = await supabase
      .from('payments')
      .select('id, status')
      .eq('id', payment_id)
      .eq('user_id', req.user.id)
      .eq('payment_type', 'subscription')
      .single();

    if (findError || !payment || payment.status !== 'completed') {
      return res.status(400).json({ message: 'Invalid or incomplete payment' });
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    // Create subscription
    const { data: subscription, error: insertError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: req.user.id,
        type,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        payment_status: 'paid',
        payment_id
      })
      .select()
      .single();

    if (insertError) {
      console.error('Create subscription error:', insertError);
      return res.status(500).json({ message: 'Server error' });
    }

    res.status(201).json({ subscription });
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
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get subscription history error:', error);
      return res.status(500).json({ message: 'Server error' });
    }

    res.json({ subscriptions: subscriptions || [] });
  } catch (error) {
    console.error('Get subscription history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;



