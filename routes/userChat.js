const express = require('express');
const ChatMessage = require('../models/ChatMessage');
const MedicalOfficer = require('../models/MedicalOfficer');
const { authenticateUserMongo } = require('../middleware/auth_mongo');

const router = express.Router();

const authenticateUser = authenticateUserMongo;

// Helper function to generate conversation ID
const generateConversationId = (senderId, receiverId, senderType, receiverType) => {
  const ids = [senderId, receiverId].sort();
  const types = [senderType, receiverType].sort();
  return `${types[0]}_${ids[0]}_${types[1]}_${ids[1]}`;
};

// Get list of available medical officers
router.get('/medical-officers', authenticateUser, async (req, res) => {
  try {
    const medicalOfficers = await MedicalOfficer.find(
      { isActive: true, isApproved: true },
      'name specialization hospital email phoneNumber'
    ).sort({ name: 1 });

    res.json({
      success: true,
      medicalOfficers
    });
  } catch (error) {
    console.error('Get medical officers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get user's conversations
router.get('/conversations', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;

    // Find all conversations involving this user
    const conversations = await ChatMessage.aggregate([
      {
        $match: {
          $or: [
            { senderId: userId, senderType: 'user' },
            { receiverId: userId, receiverType: 'user' }
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
                    { $eq: ['$receiverId', userId] },
                    { $eq: ['$receiverType', 'user'] },
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

    // Add medical officer details to conversations
    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = conv.lastMessage;
        let medicalOfficerId = null;

        if (lastMessage.senderType === 'medical_officer') {
          medicalOfficerId = lastMessage.senderId;
        } else if (lastMessage.receiverType === 'medical_officer') {
          medicalOfficerId = lastMessage.receiverId;
        }

        if (medicalOfficerId) {
          const medicalOfficer = await MedicalOfficer.findById(medicalOfficerId)
            .select('name specialization hospital');
          conv.medicalOfficer = medicalOfficer;
        }

        return conv;
      })
    );

    res.json({
      success: true,
      conversations: conversationsWithDetails
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
router.get('/messages/:conversationId', authenticateUser, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.uid;

    // Verify user is part of this conversation
    const conversationCheck = await ChatMessage.findOne({
      conversationId,
      $or: [
        { senderId: userId, senderType: 'user' },
        { receiverId: userId, receiverType: 'user' }
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
        receiverId: userId,
        receiverType: 'user',
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

// Send message to medical officer
router.post('/send/:medicalOfficerId', authenticateUser, async (req, res) => {
  try {
    const { medicalOfficerId } = req.params;
    const { message } = req.body;
    const userId = req.user.uid;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // Verify medical officer exists and is active
    const medicalOfficer = await MedicalOfficer.findById(medicalOfficerId);
    if (!medicalOfficer || !medicalOfficer.isActive || !medicalOfficer.isApproved) {
      return res.status(404).json({
        success: false,
        message: 'Medical officer not found or unavailable'
      });
    }

    const conversationId = generateConversationId(
      userId,
      medicalOfficerId,
      'user',
      'medical_officer'
    );

    const newMessage = new ChatMessage({
      conversationId,
      senderId: userId,
      senderType: 'user',
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
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
