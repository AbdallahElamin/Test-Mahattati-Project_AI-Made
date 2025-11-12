const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads/blog');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'blog-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 }
});

// @route   GET /api/blog
// @desc    Get all published blog posts
// @access  Public
router.get('/', async (req, res) => {
  try {
    const [posts] = await pool.execute(
      `SELECT bp.*, u.name as author_name 
       FROM blog_posts bp 
       JOIN users u ON bp.author_id = u.id 
       WHERE bp.status = 'published' 
       ORDER BY bp.publish_date DESC, bp.created_at DESC`
    );

    res.json({ posts });
  } catch (error) {
    console.error('Get blog posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/blog/:id
// @desc    Get single blog post
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [posts] = await pool.execute(
      `SELECT bp.*, u.name as author_name 
       FROM blog_posts bp 
       JOIN users u ON bp.author_id = u.id 
       WHERE bp.id = ? AND bp.status = 'published'`,
      [id]
    );

    if (posts.length === 0) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    // Increment views
    await pool.execute(
      'UPDATE blog_posts SET views_count = views_count + 1 WHERE id = ?',
      [id]
    );

    res.json({ post: posts[0] });
  } catch (error) {
    console.error('Get blog post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/blog
// @desc    Create blog post (Manager only)
// @access  Private (System Manager, Marketing Manager)
router.post('/', authenticate, authorize('system_manager', 'marketing_manager'), 
  upload.single('media'), [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('content').trim().notEmpty().withMessage('Content is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, title_ar, content, content_ar, status = 'draft' } = req.body;
    const mediaUrl = req.file ? `/uploads/blog/${req.file.filename}` : null;
    const mediaType = req.file ? (req.file.mimetype.startsWith('video/') ? 'video' : 'image') : 'none';

    const [result] = await pool.execute(
      `INSERT INTO blog_posts (author_id, title, title_ar, content, content_ar, media_url, media_type, status, publish_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        title,
        title_ar || null,
        content,
        content_ar || null,
        mediaUrl,
        mediaType,
        status,
        status === 'published' ? new Date() : null
      ]
    );

    const [post] = await pool.execute('SELECT * FROM blog_posts WHERE id = ?', [result.insertId]);
    res.status(201).json({ post: post[0] });
  } catch (error) {
    console.error('Create blog post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/blog/:id
// @desc    Update blog post
// @access  Private (System Manager, Marketing Manager)
router.put('/:id', authenticate, authorize('system_manager', 'marketing_manager'), 
  upload.single('media'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership or manager role
    const [posts] = await pool.execute('SELECT author_id FROM blog_posts WHERE id = ?', [id]);
    if (posts.length === 0) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    const updateFields = [];
    const updateValues = [];

    const allowedFields = ['title', 'title_ar', 'content', 'content_ar', 'status'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(req.body[field]);
      }
    });

    if (req.file) {
      updateFields.push('media_url = ?');
      updateFields.push('media_type = ?');
      updateValues.push(`/uploads/blog/${req.file.filename}`);
      updateValues.push(req.file.mimetype.startsWith('video/') ? 'video' : 'image');
    }

    if (req.body.status === 'published' && !posts[0].publish_date) {
      updateFields.push('publish_date = ?');
      updateValues.push(new Date());
    }

    if (updateFields.length > 0) {
      updateValues.push(id);
      await pool.execute(
        `UPDATE blog_posts SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    }

    const [updatedPost] = await pool.execute('SELECT * FROM blog_posts WHERE id = ?', [id]);
    res.json({ post: updatedPost[0] });
  } catch (error) {
    console.error('Update blog post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;



