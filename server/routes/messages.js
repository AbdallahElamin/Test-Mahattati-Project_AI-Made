const express = require('express');
const { body, validationResult } = require('express-validator');
const supabase = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/messages
// @desc    Send a message
// @access  Private
router.post('/', authenticate, [
  body('receiver_id').isInt().withMessage('Receiver ID is required'),
  body('content').trim().notEmpty().withMessage('Message content is required'),
  body('ad_id').optional().isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { receiver_id, content, ad_id } = req.body;

    // Check if receiver exists
    const { data: receiver, error: receiverError } = await supabase
      .from('users')
      .select('id')
      .eq('id', receiver_id)
      .single();

    if (receiverError || !receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    // Insert message
    const { data: newMessage, error: insertError } = await supabase
      .from('messages')
      .insert({
        sender_id: req.user.id,
        receiver_id,
        ad_id: ad_id || null,
        content
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert message error:', insertError);
      return res.status(500).json({ message: 'Server error' });
    }

    // Create notification for receiver
    await supabase
      .from('notifications')
      .insert({
        user_id: receiver_id,
        type: 'message',
        title: 'New Message',
        title_ar: 'رسالة جديدة',
        message: `You have a new message from ${req.user.name}`,
        message_ar: `لديك رسالة جديدة من ${req.user.name}`,
        link_url: `/messages/${newMessage.id}`
      });

    res.status(201).json({ message: newMessage });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/messages
// @desc    Get user's conversations
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    // Get all messages where user is sender or receiver
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${req.user.id},receiver_id.eq.${req.user.id}`)
      .order('created_at', { ascending: false });

    if (messagesError) {
      console.error('Get messages error:', messagesError);
      return res.status(500).json({ message: 'Server error' });
    }

    // Group messages by conversation partner
    const conversationsMap = new Map();

    for (const message of messages || []) {
      const otherUserId = message.sender_id === req.user.id 
        ? message.receiver_id 
        : message.sender_id;

      if (!conversationsMap.has(otherUserId)) {
        // Get other user info
        const { data: otherUser } = await supabase
          .from('users')
          .select('id, name, profile_image')
          .eq('id', otherUserId)
          .single();

        // Get unread count
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', req.user.id)
          .eq('sender_id', otherUserId)
          .eq('is_read', false);

        conversationsMap.set(otherUserId, {
          other_user_id: otherUserId,
          other_user_name: otherUser?.name || '',
          other_user_image: otherUser?.profile_image || null,
          last_message: message.content,
          last_message_time: message.created_at,
          unread_count: unreadCount || 0
        });
      }
    }

    const conversations = Array.from(conversationsMap.values())
      .sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time));

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/messages/:userId
// @desc    Get messages with a specific user
// @access  Private
router.get('/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    // Get messages between the two users
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${req.user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${req.user.id})`)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Get messages error:', messagesError);
      return res.status(500).json({ message: 'Server error' });
    }

    // Get user info for sender and receiver
    const userIds = [...new Set((messages || []).flatMap(msg => [msg.sender_id, msg.receiver_id]))];
    const { data: users } = await supabase
      .from('users')
      .select('id, name, profile_image')
      .in('id', userIds);

    const usersMap = new Map((users || []).map(user => [user.id, user]));

    // Mark messages as read
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', req.user.id)
      .eq('sender_id', userId)
      .eq('is_read', false);

    // Transform messages to match expected format
    const transformedMessages = (messages || []).map(msg => {
      const sender = usersMap.get(msg.sender_id);
      const receiver = usersMap.get(msg.receiver_id);
      return {
        ...msg,
        sender_name: sender?.name || '',
        sender_image: sender?.profile_image || null,
        receiver_name: receiver?.name || '',
        receiver_image: receiver?.profile_image || null
      };
    });

    res.json({ messages: transformedMessages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;



