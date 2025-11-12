const express = require('express');
const { body, validationResult, query } = require('express-validator');
const pool = require('../config/database');
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

    let query = 'SELECT id, name, email, role, phone, company_name, email_verified, created_at FROM users';
    const params = [];

    if (role) {
      query += ' WHERE role = ?';
      params.push(role);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [users] = await pool.execute(query, params);
    const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM users' + (role ? ' WHERE role = ?' : ''), role ? [role] : []);
    const total = countResult[0].total;

    res.json({ users, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
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
    const updateFields = [];
    const updateValues = [];

    const allowedFields = ['name', 'email', 'role', 'phone', 'company_name', 'email_verified'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(req.body[field]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updateValues.push(id);
    await pool.execute(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    const [user] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    res.json({ user: user[0] });
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

    const dateFilter = start_date && end_date ? 
      `WHERE created_at BETWEEN ? AND ?` : 
      start_date ? `WHERE created_at >= ?` : 
      end_date ? `WHERE created_at <= ?` : '';
    const dateParams = [];
    if (start_date) dateParams.push(start_date);
    if (end_date) dateParams.push(end_date);

    switch (type) {
      case 'users':
        const [userStats] = await pool.execute(
          `SELECT role, COUNT(*) as count FROM users ${dateFilter} GROUP BY role`,
          dateParams
        );
        const [totalUsers] = await pool.execute('SELECT COUNT(*) as total FROM users' + (dateFilter ? ' ' + dateFilter : ''), dateParams);
        report = { by_role: userStats, total: totalUsers[0].total };
        break;

      case 'ads':
        const [adStats] = await pool.execute(
          `SELECT status, COUNT(*) as count FROM ads ${dateFilter} GROUP BY status`,
          dateParams
        );
        const [totalAds] = await pool.execute('SELECT COUNT(*) as total FROM ads' + (dateFilter ? ' ' + dateFilter : ''), dateParams);
        const [promotedAds] = await pool.execute('SELECT COUNT(*) as total FROM ads WHERE is_promoted = TRUE' + (dateFilter ? ' AND ' + dateFilter.replace('WHERE', '') : ''), dateParams);
        report = { by_status: adStats, total: totalAds[0].total, promoted: promotedAds[0].total };
        break;

      case 'payments':
        const [paymentStats] = await pool.execute(
          `SELECT gateway, status, SUM(amount) as total_amount, COUNT(*) as count 
           FROM payments ${dateFilter} GROUP BY gateway, status`,
          dateParams
        );
        const [totalRevenue] = await pool.execute(
          `SELECT SUM(amount) as total FROM payments WHERE status = 'completed'` + (dateFilter ? ' AND ' + dateFilter.replace('WHERE', '') : ''),
          dateParams.filter((_, i) => !dateParams[i] || dateParams[i].includes('2024'))
        );
        report = { by_gateway_status: paymentStats, total_revenue: totalRevenue[0].total || 0 };
        break;

      case 'subscriptions':
        const [subStats] = await pool.execute(
          `SELECT payment_status, COUNT(*) as count FROM subscriptions ${dateFilter} GROUP BY payment_status`,
          dateParams
        );
        const [activeSubs] = await pool.execute(
          `SELECT COUNT(*) as total FROM subscriptions WHERE payment_status = 'paid' AND end_date >= CURDATE()` + 
          (dateFilter ? ' AND ' + dateFilter.replace('WHERE', '') : ''),
          dateParams
        );
        report = { by_status: subStats, active: activeSubs[0].total };
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

    let query = 'SELECT * FROM logs';
    const params = [];
    const conditions = [];

    if (event_type) {
      conditions.push('event_type = ?');
      params.push(event_type);
    }
    if (user_id) {
      conditions.push('user_id = ?');
      params.push(user_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [logs] = await pool.execute(query, params);

    const parsedLogs = logs.map(log => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : {}
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

    const [result] = await pool.execute(
      `INSERT INTO sponsored_ads (created_by, title, media_url, media_type, position, link_url, start_date, end_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, title || null, media_url, media_type, position, link_url || null, start_date || null, end_date || null]
    );

    const [sponsoredAd] = await pool.execute('SELECT * FROM sponsored_ads WHERE id = ?', [result.insertId]);
    res.status(201).json({ sponsored_ad: sponsoredAd[0] });
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
    const [ads] = await pool.execute(
      'SELECT * FROM sponsored_ads ORDER BY created_at DESC'
    );
    res.json({ sponsored_ads: ads });
  } catch (error) {
    console.error('Get sponsored ads error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;



