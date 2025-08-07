const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Comment = require('../models/Comment');

// Add reaction to a post
router.post('/posts/:postId/react', async (req, res) => {
  try {
    const { userId, userName, type } = req.body;
    
    if (!['like', 'love', 'laugh', 'wow', 'sad', 'angry'].includes(type)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid reaction type' 
      });
    }

    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ 
        success: false,
        message: 'Post not found' 
      });
    }

    // Remove any existing reaction from this user
    post.reactions = post.reactions.filter(r => r.userId !== userId);
    
    // Add the new reaction
    post.reactions.push({ type, userId, userName });
    post.totalReactions = post.reactions.length;

    await post.save();
    
    // Calculate reaction counts
    const reactionCounts = {};
    post.reactions.forEach(reaction => {
      reactionCounts[reaction.type] = (reactionCounts[reaction.type] || 0) + 1;
    });

    res.json({
      success: true,
      ...post.toObject(),
      reactionCounts,
      totalReactions: post.reactions.length
    });
  } catch (err) {
    console.error('Reaction error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error processing reaction' 
    });
  }
});

// Add reaction to a comment
router.post('/posts/:postId/comments/:commentId/react', async (req, res) => {
  try {
    const { userId, userName, type } = req.body;
    
    if (!['like', 'love', 'laugh', 'wow', 'sad', 'angry'].includes(type)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid reaction type' 
      });
    }

    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ 
        success: false,
        message: 'Comment not found' 
      });
    }

    // Remove any existing reaction from this user
    comment.reactions = comment.reactions.filter(r => r.userId !== userId);
    
    // Add the new reaction
    comment.reactions.push({ type, userId, userName });
    comment.totalReactions = comment.reactions.length;

    await comment.save();
    
    // Calculate reaction counts
    const reactionCounts = {};
    comment.reactions.forEach(reaction => {
      reactionCounts[reaction.type] = (reactionCounts[reaction.type] || 0) + 1;
    });

    res.json({
      success: true,
      ...comment.toObject(),
      reactionCounts,
      totalReactions: comment.reactions.length
    });
  } catch (err) {
    console.error('Reaction error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error processing reaction' 
    });
  }
});

// Get reaction counts for a post
router.get('/posts/:postId/reactions', async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const reactionCounts = {};
    post.reactions.forEach(reaction => {
      reactionCounts[reaction.type] = (reactionCounts[reaction.type] || 0) + 1;
    });

    res.json({
      reactionCounts,
      totalReactions: post.reactions.length,
      reactions: post.reactions
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get reaction counts for a comment
router.get('/posts/:postId/comments/:commentId/reactions', async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const reactionCounts = {};
    comment.reactions.forEach(reaction => {
      reactionCounts[reaction.type] = (reactionCounts[reaction.type] || 0) + 1;
    });

    res.json({
      reactionCounts,
      totalReactions: comment.reactions.length,
      reactions: comment.reactions
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;