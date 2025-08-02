const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  animalName: { type: String, required: true },
  experience: { type: String, required: true },
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  photoUrl: { type: String },
  likes: { type: Number, default: 0 },
  likedBy: { type: [String], default: [] },
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', PostSchema);