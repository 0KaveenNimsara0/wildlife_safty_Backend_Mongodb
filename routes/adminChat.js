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
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalMessages = await ChatMessage.countDocuments();

    // Manually fetch sender details for each message
    const messagesWithSenderDetails = await Promise.all(
      messages.map(async (message) => {
        let senderDetails = null;

        try {
            if (message.senderType === 'user') {
              const User = require('../models/User');
              // Fix: query by uid instead of _id since User model uses uid as unique identifier
              senderDetails = await User.findOne({ uid: message.senderId }).select('displayName email');
            } else if (message.senderType === 'medical_officer') {
              const MedicalOfficer = require('../models/MedicalOfficer');
              senderDetails = await MedicalOfficer.findById(message.senderId).select('name email specialization');
            } else if (message.senderType === 'admin') {
              const Admin = require('../models/Admin');
              senderDetails = await Admin.findById(message.senderId).select('name email');
            }
        } catch (error) {
          console.error('Error fetching sender details:', error);
        }

        return {
          ...message.toObject(),
          sender: senderDetails ? {
            _id: senderDetails._id,
            name: senderDetails.name,
            email: senderDetails.email,
            type: message.senderType,
            ...(senderDetails.specialization && { specialization: senderDetails.specialization })
          } : null
        };
      })
    );

    res.json({
      success: true,
      messages: messagesWithSenderDetails,
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
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalMessages = await PublishedMessage.countDocuments();

    // Manually fetch author details for each published message
    const messagesWithAuthorDetails = await Promise.all(
      messages.map(async (message) => {
        let authorDetails = null;

        try {
          if (message.author.type === 'medical_officer') {
            const MedicalOfficer = require('../models/MedicalOfficer');
            authorDetails = await MedicalOfficer.findById(message.author.id).select('name email specialization');
          }
        } catch (error) {
          console.error('Error fetching author details:', error);
        }

        return {
          ...message.toObject(),
          author: authorDetails ? {
            ...message.author,
            _id: authorDetails._id,
            name: authorDetails.name,
            email: authorDetails.email,
            specialization: authorDetails.specialization
          } : message.author
        };
      })
    );

    res.json({
      success: true,
      messages: messagesWithAuthorDetails,
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

    // Fetch sender details for the published message
    let authorDetails = null;
    try {
    if (chatMessage.senderType === 'medical_officer') {
      const MedicalOfficer = require('../models/MedicalOfficer');
      authorDetails = await MedicalOfficer.findById(chatMessage.senderId).select('name email specialization');
    } else if (chatMessage.senderType === 'user') {
      const User = require('../models/User');
      // Fix: query by uid instead of _id
      authorDetails = await User.findOne({ uid: chatMessage.senderId }).select('displayName email');
    }
    } catch (error) {
      console.error('Error fetching author details:', error);
    }

    const publishedMessage = new PublishedMessage({
      title: title || chatMessage.message,
      content: content || chatMessage.message,
      author: authorDetails ? {
        id: authorDetails._id.toString(),
        name: authorDetails.name,
        type: 'medical_officer',
        specialization: authorDetails.specialization
      } : {
        id: chatMessage.senderId,
        name: 'Unknown',
        type: chatMessage.senderType
      },
      originalMessageId: messageId,
      publishedBy: {
        id: req.admin._id.toString(),
        name: req.admin.name,
        type: 'admin'
      }
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
