const express = require('express');
const { body, validationResult } = require('express-validator');
const supabase = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/comments
// @desc    Add a comment to an ad
// @access  Private
router.post('/', authenticate, [
  body('ad_id').isInt().withMessage('Ad ID is required'),
  body('content').trim().notEmpty().withMessage('Comment content is required'),
  body('parent_id').optional().isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { ad_id, content, parent_id } = req.body;

    // Verify ad exists
    const { data: ad, error: adError } = await supabase
      .from('ads')
      .select('user_id')
      .eq('id', ad_id)
      .single();

    if (adError || !ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    const { data: comment, error: insertError } = await supabase
      .from('comments')
      .insert({
        ad_id,
        user_id: req.user.id,
        content,
        parent_id: parent_id || null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert comment error:', insertError);
      return res.status(500).json({ message: 'Server error' });
    }

    // Get user info
    const { data: user } = await supabase
      .from('users')
      .select('id, name, profile_image')
      .eq('id', req.user.id)
      .single();

    // Notify ad owner
    if (ad.user_id !== req.user.id) {
      await supabase
        .from('notifications')
        .insert({
          user_id: ad.user_id,
          type: 'comment',
          title: 'New Comment',
          title_ar: 'تعليق جديد',
          message: `${req.user.name} commented on your ad`,
          message_ar: `علق ${req.user.name} على إعلانك`,
          link_url: `/ads/${ad_id}`
        });
    }

    // Transform comment to match expected format
    const transformedComment = {
      ...comment,
      user_name: user?.name || '',
      profile_image: user?.profile_image || null
    };

    res.status(201).json({ comment: transformedComment });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/comments/:adId
// @desc    Get comments for an ad
// @access  Private
router.get('/:adId', authenticate, async (req, res) => {
  try {
    const { adId } = req.params;

    const { data: comments, error } = await supabase
      .from('comments')
      .select('*')
      .eq('ad_id', adId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Get comments error:', error);
      return res.status(500).json({ message: 'Server error' });
    }

    // Get user info for all comments
    const userIds = [...new Set((comments || []).map(c => c.user_id))];
    const { data: users } = await supabase
      .from('users')
      .select('id, name, profile_image')
      .in('id', userIds);

    const usersMap = new Map((users || []).map(user => [user.id, user]));

    // Transform comments to match expected format
    const transformedComments = (comments || []).map(comment => {
      const user = usersMap.get(comment.user_id);
      return {
        ...comment,
        user_name: user?.name || '',
        profile_image: user?.profile_image || null
      };
    });

    res.json({ comments: transformedComments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;



