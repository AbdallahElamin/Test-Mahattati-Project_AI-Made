const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const supabase = require('../config/database');
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
    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .order('publish_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get blog posts error:', error);
      return res.status(500).json({ message: 'Server error' });
    }

    // Get author info for all posts
    const authorIds = [...new Set((posts || []).map(p => p.author_id))];
    const { data: authors } = await supabase
      .from('users')
      .select('id, name')
      .in('id', authorIds);

    const authorsMap = new Map((authors || []).map(author => [author.id, author]));

    // Transform posts to match expected format
    const transformedPosts = (posts || []).map(post => {
      const author = authorsMap.get(post.author_id);
      return {
        ...post,
        author_name: author?.name || ''
      };
    });

    res.json({ posts: transformedPosts });
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

    const { data: post, error: findError } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .eq('status', 'published')
      .single();

    if (findError || !post) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    // Get author info
    const { data: author } = await supabase
      .from('users')
      .select('id, name')
      .eq('id', post.author_id)
      .single();

    // Increment views
    await supabase
      .from('blog_posts')
      .update({ views_count: (post.views_count || 0) + 1 })
      .eq('id', id);

    // Transform post to match expected format
    const transformedPost = {
      ...post,
      author_name: author?.name || ''
    };

    res.json({ post: transformedPost });
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

    const { data: post, error: insertError } = await supabase
      .from('blog_posts')
      .insert({
        author_id: req.user.id,
        title,
        title_ar: title_ar || null,
        content,
        content_ar: content_ar || null,
        media_url: mediaUrl,
        media_type: mediaType,
        status,
        publish_date: status === 'published' ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Create blog post error:', insertError);
      return res.status(500).json({ message: 'Server error' });
    }

    res.status(201).json({ post });
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
    const { data: existingPost, error: findError } = await supabase
      .from('blog_posts')
      .select('author_id, publish_date')
      .eq('id', id)
      .single();

    if (findError || !existingPost) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    const updateData = {};

    const allowedFields = ['title', 'title_ar', 'content', 'content_ar', 'status'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (req.file) {
      updateData.media_url = `/uploads/blog/${req.file.filename}`;
      updateData.media_type = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    }

    if (req.body.status === 'published' && !existingPost.publish_date) {
      updateData.publish_date = new Date().toISOString();
    }

    if (Object.keys(updateData).length > 0) {
      const { data: updatedPost, error: updateError } = await supabase
        .from('blog_posts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError || !updatedPost) {
        return res.status(500).json({ message: 'Server error updating blog post' });
      }

      res.json({ post: updatedPost });
    } else {
      // No fields to update, return existing post
      const { data: post } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', id)
        .single();

      res.json({ post });
    }
  } catch (error) {
    console.error('Update blog post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;



