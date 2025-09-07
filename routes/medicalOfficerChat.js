const express = require('express');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');
const { authenticateMedicalOfficer } = require('../middleware/auth_medical_officer');
const admin = require('../firebaseAdmin');

const router = express.Router();

// Helper function to get user data from Firebase
async function getUserFromFirebase(uid) {
  try {
    const userRecord = await admin.auth().getUser(uid);
    return {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName || userRecord.email,
      photoURL: userRecord.photoURL || null
    };
  } catch (error) {
    console.error('Error fetching user from Firebase:', error);
    return null;
  }
}

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

    // Add user details to conversations
    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = conv.lastMessage;
        let userId = null;

        if (lastMessage.senderType === 'user') {
          userId = lastMessage.senderId;
        } else if (lastMessage.receiverType === 'user') {
          userId = lastMessage.receiverId;
        }

        if (userId) {
          // Try to get user from Firebase first
          let user = await getUserFromFirebase(userId);

          // If not found in Firebase, try MongoDB as fallback
          if (!user) {
            const mongoose = require('mongoose');
            if (mongoose.Types.ObjectId.isValid(userId)) {
              user = await User.findOne({ _id: userId }).select('displayName email photoURL uid');
            }
            if (!user) {
              user = await User.findOne({ uid: userId }).select('displayName email photoURL uid');
            }
          }

          conv.user = user;
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
router.post('/send/:userId', authenticateMedicalOfficer, async (req, res) => {
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

    // Verify user exists in Firebase
    const user = await getUserFromFirebase(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
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
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
