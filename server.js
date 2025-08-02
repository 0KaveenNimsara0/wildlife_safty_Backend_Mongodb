require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wildguard');

// MongoDB Models
const Post = require('./models/Post');
const Comment = require('./models/Comment');

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Routes
app.post('/api/posts', upload.single('photo'), async (req, res) => {
  try {
    const { animalName, experience, authorId, authorName } = req.body;
    
    const newPost = new Post({
      animalName,
      experience,
      authorId,
      authorName,
      photoUrl: req.file ? `/uploads/${req.file.filename}` : null
    });

    await newPost.save();
    res.status(201).json(newPost);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).populate('comments');
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/posts/:postId/comments', async (req, res) => {
  try {
    const { authorId, authorName, text } = req.body;
    
    const newComment = new Comment({
      postId: req.params.postId,
      authorId,
      authorName,
      text
    });

    await newComment.save();
    
    // Add comment to post
    await Post.findByIdAndUpdate(req.params.postId, {
      $push: { comments: newComment._id }
    });

    res.status(201).json(newComment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/posts/:postId/like', async (req, res) => {
  try {
    const { userId } = req.body;
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const userIndex = post.likedBy.indexOf(userId);
    
    if (userIndex === -1) {
      // Add like
      post.likedBy.push(userId);
      post.likes = post.likedBy.length;
    } else {
      // Remove like
      post.likedBy.splice(userIndex, 1);
      post.likes = post.likedBy.length;
    }

    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));