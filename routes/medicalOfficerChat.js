const express = require('express');
const ChatMessage = require('../models/ChatMessage');
const { authenticateMedicalOfficer } = require('./medicalOfficerAuth');
const { authenticateAdmin } = require('./adminAuth');

const router = express.Router();

// Helper function to generate conversation ID
const generateConversationId = (senderId, receiverId, senderType, receiverType) => {
  const ids = [senderId, receiverId].sort();
  const types = [senderType, receiverType].sort();
  return `${types[0]}_${ids[0]}_${types[1]}_${ids[1]}`;
};

// Get conversations for medical officer
router.get('/conversations', authenticateMedicalOfficer, async (req, res) => {
  try {
    const medicalOfficerId = req.medicalOfficer._id.toString();

    // Find all conversations involving this medical officer
    const conversations = await ChatMessage.aggregate([
      {
        $match: {
          $or: [
            { senderId: medicalOfficerId, senderType: 'medical_officer' },
            { receiverId: medicalOfficerId, receiverType: 'medical_officer' }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$$ROOT' },
          messageCount: { $sum: 1 },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiverId', medicalOfficerId] },
                    { $eq: ['$receiverType', 'medical_officer'] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);

    res.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get messages for a specific conversation
router.get('/messages/:conversationId', authenticateMedicalOfficer, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const medicalOfficerId = req.medicalOfficer._id.toString();

    // Verify medical officer is part of this conversation
    const conversationCheck = await ChatMessage.findOne({
      conversationId,
      $or: [
        { senderId: medicalOfficerId, senderType: 'medical_officer' },
        { receiverId: medicalOfficerId, receiverType: 'medical_officer' }
      ]
    });

    if (!conversationCheck) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this conversation'
      });
    }

    const messages = await ChatMessage.find({ conversationId })
      .sort({ createdAt: 1 })
      .limit(100);

    // Mark messages as read
    await ChatMessage.updateMany(
      {
        conversationId,
        receiverId: medicalOfficerId,
        receiverType: 'medical_officer',
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Send message to user
router.post('/send/user/:userId', authenticateMedicalOfficer, async (req, res) => {
  try {
    const { userId } = req.params;
    const { message } = req.body;
    const medicalOfficerId = req.medicalOfficer._id.toString();

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const conversationId = generateConversationId(
      medicalOfficerId,
      userId,
      'medical_officer',
      'user'
    );

    const newMessage = new ChatMessage({
      conversationId,
      senderId: medicalOfficerId,
      senderType: 'medical_officer',
      receiverId: userId,
      receiverType: 'user',
      message: message.trim()
    });

    await newMessage.save();

    res.json({
      success: true,
      message: newMessage
    });
  } catch (error) {
    console.error('Send message to user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Send message to admin
router.post('/send/admin', authenticateMedicalOfficer, async (req, res) => {
  try {
    const { message } = req.body;
    const medicalOfficerId = req.medicalOfficer._id.toString();

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // For now, we'll use a generic admin ID. In a real app, you'd get the specific admin ID
    const adminId = 'admin_system';

    const conversationId = generateConversationId(
      medicalOfficerId,
      adminId,
      'medical_officer',
      'admin'
    );

    const newMessage = new ChatMessage({
      conversationId,
      senderId: medicalOfficerId,
      senderType: 'medical_officer',
      receiverId: adminId,
      receiverType: 'admin',
      message: message.trim()
    });

    await newMessage.save();

    res.json({
      success: true,
      message: newMessage
    });
  } catch (error) {
    console.error('Send message to admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get admin conversations (for admin side)
router.get('/admin/conversations', authenticateAdmin, async (req, res) => {
  try {
    const conversations = await ChatMessage.aggregate([
      {
        $match: {
          $or: [
            { senderType: 'admin', receiverType: 'medical_officer' },
            { senderType: 'medical_officer', receiverType: 'admin' }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$$ROOT' },
          messageCount: { $sum: 1 },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiverType', 'admin'] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);

    res.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error('Get admin conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Admin send message to medical officer
router.post('/admin/send/:medicalOfficerId', authenticateAdmin, async (req, res) => {
  try {
    const { medicalOfficerId } = req.params;
    const { message } = req.body;
    const adminId = req.admin._id.toString();

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const conversationId = generateConversationId(
      adminId,
      medicalOfficerId,
      'admin',
      'medical_officer'
    );

    const newMessage = new ChatMessage({
      conversationId,
      senderId: adminId,
      senderType: 'admin',
      receiverId: medicalOfficerId,
      receiverType: 'medical_officer',
      message: message.trim()
    });

    await newMessage.save();

    res.json({
      success: true,
      message: newMessage
    });
  } catch (error) {
    console.error('Admin send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
