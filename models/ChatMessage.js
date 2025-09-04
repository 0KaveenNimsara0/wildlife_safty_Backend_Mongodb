const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  senderId: {
    type: String,
    required: true
  },
  senderType: {
    type: String,
    required: true,
    enum: ['user', 'medical_officer', 'admin']
  },
  receiverId: {
    type: String,
    required: true
  },
  receiverType: {
    type: String,
    required: true,
    enum: ['user', 'medical_officer', 'admin']
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  messageType: {
    type: String,
    default: 'text',
    enum: ['text', 'image', 'file']
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for efficient conversation queries
chatMessageSchema.index({ conversationId: 1, createdAt: -1 });

// Update updatedAt on save
chatMessageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
