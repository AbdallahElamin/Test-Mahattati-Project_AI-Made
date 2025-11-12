const express = require('express');
const supabase = require('../config/database');

const router = express.Router();

// @route   GET /api/news-ticker
// @desc    Get active news ticker items
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { data: news, error } = await supabase
      .from('news_ticker')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get news ticker error:', error);
      return res.status(500).json({ message: 'Server error' });
    }

    res.json({ news: news || [] });
  } catch (error) {
    console.error('Get news ticker error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;



