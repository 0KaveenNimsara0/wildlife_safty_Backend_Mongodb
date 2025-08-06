const mongoose = require('mongoose');

const ReactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['like', 'love', 'laugh', 'wow', 'sad', 'angry'], required: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true }
}, { _id: false });

const CommentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null }, // For nested replies
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  authorAvatar: { type: String, default: '' },
  text: { type: String, required: true },
  reactions: [ReactionSchema],
  totalReactions: { type: Number, default: 0 },
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }], // Store reply IDs
  isEdited: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Virtual for reaction counts by type
CommentSchema.virtual('reactionCounts').get(function() {
  const counts = {};
  this.reactions.forEach(reaction => {
    counts[reaction.type] = (counts[reaction.type] || 0) + 1;
  });
  return counts;
});

// Index for efficient querying
CommentSchema.index({ postId: 1, parentId: 1 });
CommentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Comment', CommentSchema);
