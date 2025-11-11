const express = require('express');
const pool = require('../config/database');

const router = express.Router();

// @route   GET /api/news-ticker
// @desc    Get active news ticker items
// @access  Public
router.get('/', async (req, res) => {
  try {
    const [news] = await pool.execute(
      'SELECT * FROM news_ticker WHERE is_active = TRUE ORDER BY priority DESC, created_at DESC'
    );
    res.json({ news });
  } catch (error) {
    console.error('Get news ticker error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


