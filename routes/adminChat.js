const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const PublishedMessage = require('../models/PublishedMessage');
const { authenticateAdmin } = require('./adminAuth');

// Get all chat messages
router.get('/messages', authenticateAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const messages = await ChatMessage.find()
      .populate('sender', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalMessages = await ChatMessage.countDocuments();

    res.json({
      success: true,
      messages,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalMessages / limit),
        totalMessages,
        hasNext: page * limit < totalMessages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching messages'
    });
  }
});

// Get published messages
router.get('/published-messages', authenticateAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const messages = await PublishedMessage.find()
      .populate('author', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalMessages = await PublishedMessage.countDocuments();

    res.json({
      success: true,
      messages,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalMessages / limit),
        totalMessages,
        hasNext: page * limit < totalMessages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get published messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching published messages'
    });
  }
});

// Publish a message
router.post('/publish-message/:messageId', authenticateAdmin, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { title, content } = req.body;

    const chatMessage = await ChatMessage.findById(messageId);
    if (!chatMessage) {
      return res.status(404).json({
        success: false,
        message: 'Chat message not found'
      });
    }

    const publishedMessage = new PublishedMessage({
      title: title || chatMessage.message,
      content: content || chatMessage.message,
      author: chatMessage.sender,
      originalMessage: messageId,
      publishedBy: req.admin._id
    });

    await publishedMessage.save();

    res.json({
      success: true,
      message: 'Message published successfully',
      publishedMessage
    });
  } catch (error) {
    console.error('Publish message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error publishing message'
    });
  }
});

// Delete a published message
router.delete('/published-messages/:messageId', authenticateAdmin, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await PublishedMessage.findByIdAndDelete(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Published message not found'
      });
    }

    res.json({
      success: true,
      message: 'Published message deleted successfully'
    });
  } catch (error) {
    console.error('Delete published message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting published message'
    });
  }
});

// Delete a chat message
router.delete('/messages/:messageId', authenticateAdmin, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await ChatMessage.findByIdAndDelete(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Chat message not found'
      });
    }

    res.json({
      success: true,
      message: 'Chat message deleted successfully'
    });
  } catch (error) {
    console.error('Delete chat message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting chat message'
    });
  }
});

module.exports = router;
