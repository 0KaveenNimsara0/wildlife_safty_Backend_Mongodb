require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware for debugging routes
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.originalUrl}`);
  next();
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wildguard', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// MongoDB Models
const Post = require('./models/Post');
const Comment = require('./models/Comment');
const User = require('./models/User');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
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
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate({
        path: 'comments',
        populate: {
          path: 'replies',
          model: 'Comment'
        }
      });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/posts/:postId/comments', async (req, res) => {
  try {
    const { authorId, authorName, text, parentId } = req.body;
    
    const newComment = new Comment({
      postId: req.params.postId,
      authorId,
      authorName,
      text,
      parentId: parentId || null
    });

    await newComment.save();
    
    if (parentId) {
      await Comment.findByIdAndUpdate(parentId, {
        $push: { replies: newComment._id }
      });
    }
    
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
      post.likedBy.push(userId);
      post.likes = post.likedBy.length;
    } else {
      post.likedBy.splice(userIndex, 1);
      post.likes = post.likedBy.length;
    }

    await post.save();
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/posts/:postId', async (req, res) => {
  try {
    const { animalName, experience } = req.body;
    const post = await Post.findByIdAndUpdate(
      req.params.postId,
      { animalName, experience, updatedAt: Date.now() },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/posts/:postId', async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    await Comment.deleteMany({ postId: req.params.postId });
    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/posts/:postId/comments/:commentId', async (req, res) => {
  try {
    const { text } = req.body;
    const comment = await Comment.findByIdAndUpdate(
      req.params.commentId,
      { text, updatedAt: Date.now(), isEdited: true },
      { new: true }
    );

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    res.json(comment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/posts/:postId/comments/:commentId', async (req, res) => {
  try {
    const comment = await Comment.findByIdAndDelete(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    await Post.findByIdAndUpdate(req.params.postId, {
      $pull: { comments: req.params.commentId }
    });

    res.json({ message: 'Comment deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/posts/:postId/comments/:commentId/like', async (req, res) => {
  try {
    const { userId } = req.body;
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (!comment.likedBy) {
      comment.likedBy = [];
      comment.likes = 0;
    }

    const userIndex = comment.likedBy.indexOf(userId);
    
    if (userIndex === -1) {
      comment.likedBy.push(userId);
      comment.likes = comment.likedBy.length;
    } else {
      comment.likedBy.splice(userIndex, 1);
      comment.likes = comment.likedBy.length;
    }

    await comment.save();
    res.json(comment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Profile picture routes
app.post('/api/users/:uid/profile-picture', upload.single('profilePicture'), async (req, res) => {
  try {
    const { uid } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Convert image to base64 for MongoDB storage
    const imageBase64 = req.file.buffer.toString('base64');
    
    // Update or create user
    const user = await User.findOneAndUpdate(
      { uid: uid },
      {
        profilePicture: {
          data: req.file.buffer,
          contentType: req.file.mimetype
        },
        photoURL: `data:${req.file.mimetype};base64,${imageBase64}`,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      photoURL: user.photoURL,
      message: 'Profile picture updated successfully'
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});

// Get user profile
app.get('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const user = await User.findOne({ uid });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      profilePicture: user.profilePicture ? {
        data: user.profilePicture.data.toString('base64'),
        contentType: user.profilePicture.contentType
      } : null
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user profile
app.put('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { email, displayName } = req.body;

    const user = await User.findOneAndUpdate(
      { uid: uid },
      {
        email,
        displayName,
        updatedAt: new Date()
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Import reaction routes
const reactionRoutes = require('./routes/reactions');
app.use('/api', reactionRoutes);

const { router: adminAuthRoutes } = require('./routes/adminAuth');
const adminUserRoutes = require('./routes/adminUsers');
const adminChatRoutes = require('./routes/adminChat');
const adminArticlesRoutes = require('./routes/adminArticles');
const { router: medicalOfficerAuthRoutes } = require('./routes/medicalOfficerAuth');
const medicalOfficerChatRoutes = require('./routes/medicalOfficerChat');
const medicalOfficerArticlesRoutes = require('./routes/medicalOfficerArticles');
const publicArticlesRoutes = require('./routes/publicArticles');
const userChatRoutes = require('./routes/userChat');


// Admin routes
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/chat', adminChatRoutes);
app.use('/api/admin/articles', adminArticlesRoutes);

// Medical officer routes
app.use('/api/medical-officer/auth', medicalOfficerAuthRoutes);
app.use('/api/medical-officer/chat', medicalOfficerChatRoutes);
app.use('/api/medical-officer/articles', medicalOfficerArticlesRoutes);

// Public articles route
app.use('/api/articles', publicArticlesRoutes);

// User chat routes
app.use('/api/user/chat', userChatRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
