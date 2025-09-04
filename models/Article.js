const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  excerpt: {
    type: String,
    trim: true
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
      enum: ['medical_officer', 'admin']
    }
  },
  category: {
    type: String,
    required: true,
    enum: ['wildlife_safety', 'medical_advice', 'emergency_response', 'prevention', 'treatment']
  },
  tags: [{
    type: String,
    trim: true
  }],
  images: [{
    url: String,
    alt: String,
    caption: String
  }],
  status: {
    type: String,
    default: 'draft',
    enum: ['draft', 'pending_review', 'approved', 'published', 'rejected']
  },
  reviewer: {
    id: String,
    name: String,
    type: {
      type: String,
      enum: ['admin']
    },
    reviewedAt: Date,
    comments: String
  },
  publishedAt: {
    type: Date
  },
  viewCount: {
    type: Number,
    default: 0
  },
  likeCount: {
    type: Number,
    default: 0
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
articleSchema.index({ title: 'text', content: 'text', tags: 'text' });

// Update updatedAt on save
articleSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Article', articleSchema);
