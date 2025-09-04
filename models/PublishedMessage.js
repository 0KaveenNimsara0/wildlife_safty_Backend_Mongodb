const mongoose = require('mongoose');

const publishedMessageSchema = new mongoose.Schema({
  originalMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  author: {
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true,
      enum: ['medical_officer']
    },
    specialization: String
  },
  category: {
    type: String,
    required: true,
    enum: ['medical_advice', 'safety_tips', 'emergency_guidance', 'prevention', 'treatment']
  },
  tags: [{
    type: String,
    trim: true
  }],
  publishedBy: {
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true,
      enum: ['admin']
    }
  },
  publishedAt: {
    type: Date,
    default: Date.now
  },
  viewCount: {
    type: Number,
    default: 0
  },
  likeCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
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

// Text index for search functionality
publishedMessageSchema.index({ title: 'text', content: 'text', tags: 'text' });

// Update updatedAt on save
publishedMessageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('PublishedMessage', publishedMessageSchema);
