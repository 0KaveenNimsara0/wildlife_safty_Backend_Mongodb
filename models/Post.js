const mongoose = require('mongoose');

// Fix the duplicate reaction types
const ReactionSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['like', 'love', 'laugh', 'wow', 'sad', 'angry'], 
    required: true 
  },
  userId: { type: String, required: true },
  userName: { type: String, required: true }
}, { _id: false });

const PostSchema = new mongoose.Schema({
  animalName: { type: String, required: true },
  experience: { type: String, required: true },
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  photoUrl: { type: String },
  likes: { type: Number, default: 0 }, // Legacy like count
  likedBy: { type: [String], default: [] }, // Legacy likedBy array
  reactions: [ReactionSchema], // New emoji reactions
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Virtual for reaction counts by type
PostSchema.virtual('reactionCounts').get(function() {
  const counts = {};
  this.reactions.forEach(reaction => {
    counts[reaction.type] = (counts[reaction.type] || 0) + 1;
  });
  return counts;
});

// Virtual for total reaction count
PostSchema.virtual('totalReactions').get(function() {
  return this.reactions.length;
});

// Virtual for user's reaction
PostSchema.virtual('userReaction').get(function() {
  if (!this.reactions) return null;
  return this.reactions.find(r => r.userId === this.userId)?.type || null;
});

module.exports = mongoose.model('Post', PostSchema);
