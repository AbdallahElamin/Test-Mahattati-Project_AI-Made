const express = require('express');
const { body, validationResult, query } = require('express-validator');
const supabase = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require system_manager role
router.use(authenticate);
router.use(authorize('system_manager'));

// @route   GET /api/admin/users
// @desc    Get all users with filters
// @access  Private (System Manager)
router.get('/users', [
  query('role').optional().isIn(['advertiser', 'subscriber', 'system_manager', 'marketing_manager']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let usersQuery = supabase
      .from('users')
      .select('id, name, email, role, phone, company_name, email_verified, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (role) {
      usersQuery = usersQuery.eq('role', role);
    }

    const { data: users, error, count } = await usersQuery;

    if (error) {
      console.error('Get users error:', error);
      return res.status(500).json({ message: 'Server error' });
    }

    res.json({ 
      users: users || [], 
      pagination: { 
        page: parseInt(page), 
        limit: parseInt(limit), 
        total: count || 0, 
        pages: Math.ceil((count || 0) / limit) 
      } 
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user
// @access  Private (System Manager)
router.put('/users/:id', [
  body('role').optional().isIn(['advertiser', 'subscriber', 'system_manager', 'marketing_manager']),
  body('email_verified').optional().isBoolean()
], async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {};

    const allowedFields = ['name', 'email', 'role', 'phone', 'company_name', 'email_verified'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !user) {
      console.error('Update user error:', error);
      return res.status(500).json({ message: 'Server error' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/reports
// @desc    Generate reports
// @access  Private (System Manager)
router.get('/reports', [
  query('type').isIn(['users', 'ads', 'payments', 'subscriptions']).withMessage('Invalid report type'),
  query('start_date').optional().isISO8601(),
  query('end_date').optional().isISO8601()
], async (req, res) => {
  try {
    const { type, start_date, end_date } = req.query;
    let report = {};

    switch (type) {
      case 'users':
        // Get all users (with date filter if provided)
        let usersQuery = supabase.from('users').select('role', { count: 'exact' });
        if (start_date) usersQuery = usersQuery.gte('created_at', start_date);
        if (end_date) usersQuery = usersQuery.lte('created_at', end_date);
        
        const { data: users, count: totalUsers } = await usersQuery;
        
        // Group by role
        const userStats = {};
        (users || []).forEach(user => {
          userStats[user.role] = (userStats[user.role] || 0) + 1;
        });
        
        const byRole = Object.keys(userStats).map(role => ({
          role,
          count: userStats[role]
        }));
        
        report = { by_role: byRole, total: totalUsers || 0 };
        break;

      case 'ads':
        let adsQuery = supabase.from('ads').select('status, is_promoted', { count: 'exact' });
        if (start_date) adsQuery = adsQuery.gte('created_at', start_date);
        if (end_date) adsQuery = adsQuery.lte('created_at', end_date);
        
        const { data: ads, count: totalAds } = await adsQuery;
        
        // Group by status
        const adStats = {};
        let promotedCount = 0;
        (ads || []).forEach(ad => {
          adStats[ad.status] = (adStats[ad.status] || 0) + 1;
          if (ad.is_promoted) promotedCount++;
        });
        
        const byStatus = Object.keys(adStats).map(status => ({
          status,
          count: adStats[status]
        }));
        
        report = { by_status: byStatus, total: totalAds || 0, promoted: promotedCount };
        break;

      case 'payments':
        let paymentsQuery = supabase.from('payments').select('gateway, status, amount', { count: 'exact' });
        if (start_date) paymentsQuery = paymentsQuery.gte('created_at', start_date);
        if (end_date) paymentsQuery = paymentsQuery.lte('created_at', end_date);
        
        const { data: payments } = await paymentsQuery;
        
        // Group by gateway and status
        const paymentStats = {};
        let totalRevenue = 0;
        (payments || []).forEach(payment => {
          const key = `${payment.gateway}_${payment.status}`;
          if (!paymentStats[key]) {
            paymentStats[key] = {
              gateway: payment.gateway,
              status: payment.status,
              total_amount: 0,
              count: 0
            };
          }
          paymentStats[key].total_amount += parseFloat(payment.amount || 0);
          paymentStats[key].count++;
          
          if (payment.status === 'completed') {
            totalRevenue += parseFloat(payment.amount || 0);
          }
        });
        
        const byGatewayStatus = Object.values(paymentStats);
        
        report = { by_gateway_status: byGatewayStatus, total_revenue: totalRevenue };
        break;

      case 'subscriptions':
        let subsQuery = supabase.from('subscriptions').select('payment_status, end_date', { count: 'exact' });
        if (start_date) subsQuery = subsQuery.gte('created_at', start_date);
        if (end_date) subsQuery = subsQuery.lte('created_at', end_date);
        
        const { data: subscriptions } = await subsQuery;
        
        // Group by payment_status
        const subStats = {};
        const today = new Date().toISOString().split('T')[0];
        let activeCount = 0;
        
        (subscriptions || []).forEach(sub => {
          subStats[sub.payment_status] = (subStats[sub.payment_status] || 0) + 1;
          if (sub.payment_status === 'paid' && sub.end_date >= today) {
            activeCount++;
          }
        });
        
        const byStatus = Object.keys(subStats).map(status => ({
          payment_status: status,
          count: subStats[status]
        }));
        
        report = { by_status: byStatus, active: activeCount };
        break;
    }

    res.json({ report, generated_at: new Date() });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/logs
// @desc    Get system logs
// @access  Private (System Manager)
router.get('/logs', [
  query('event_type').optional().trim(),
  query('user_id').optional().isInt(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 1000 })
], async (req, res) => {
  try {
    const { event_type, user_id, page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;

    let logsQuery = supabase
      .from('logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (event_type) {
      logsQuery = logsQuery.eq('event_type', event_type);
    }
    if (user_id) {
      logsQuery = logsQuery.eq('user_id', user_id);
    }

    const { data: logs, error } = await logsQuery;

    if (error) {
      console.error('Get logs error:', error);
      return res.status(500).json({ message: 'Server error' });
    }

    // Supabase automatically handles JSON fields
    const parsedLogs = (logs || []).map(log => ({
      ...log,
      metadata: log.metadata || {}
    }));

    res.json({ logs: parsedLogs });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/admin/sponsored-ads
// @desc    Create sponsored ad (banner)
// @access  Private (System Manager, Marketing Manager)
router.post('/sponsored-ads', authenticate, authorize('system_manager', 'marketing_manager'), [
  body('media_url').notEmpty().withMessage('Media URL is required'),
  body('media_type').isIn(['image', 'video']).withMessage('Invalid media type'),
  body('position').isIn(['top_banner', 'left_sidebar', 'right_sidebar']).withMessage('Invalid position')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { media_url, media_type, position, title, link_url, start_date, end_date } = req.body;

    const { data: sponsoredAd, error: insertError } = await supabase
      .from('sponsored_ads')
      .insert({
        created_by: req.user.id,
        title: title || null,
        media_url,
        media_type,
        position,
        link_url: link_url || null,
        start_date: start_date || null,
        end_date: end_date || null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Create sponsored ad error:', insertError);
      return res.status(500).json({ message: 'Server error' });
    }

    res.status(201).json({ sponsored_ad: sponsoredAd });
  } catch (error) {
    console.error('Create sponsored ad error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/sponsored-ads
// @desc    Get all sponsored ads
// @access  Private (System Manager, Marketing Manager)
router.get('/sponsored-ads', authenticate, authorize('system_manager', 'marketing_manager'), async (req, res) => {
  try {
    const { data: ads, error } = await supabase
      .from('sponsored_ads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get sponsored ads error:', error);
      return res.status(500).json({ message: 'Server error' });
    }

    res.json({ sponsored_ads: ads || [] });
  } catch (error) {
    console.error('Get sponsored ads error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;



