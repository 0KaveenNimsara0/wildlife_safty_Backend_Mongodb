
const express = require('express');
const User = require('../models/User');
const { authenticateAdmin } = require('./adminAuth');
const admin = require('../firebaseAdmin');

const router = express.Router();

// Get all users with pagination from MongoDB
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('-profilePicture.data') // Exclude large binary data
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalUsers = await User.countDocuments();

    res.json({
      success: true,
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        hasNext: page * limit < totalUsers,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users'
    });
  }
});

// New route: Get users from Firebase Authentication
router.get('/firebase-users', authenticateAdmin, async (req, res) => {
  try {
    const maxResults = parseInt(req.query.limit) || 10;
    const pageToken = req.query.pageToken || undefined;

    const listUsersResult = await admin.auth().listUsers(maxResults, pageToken);

    const users = listUsersResult.users.map(userRecord => ({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName || '',
      photoURL: userRecord.photoURL || '',
      disabled: userRecord.disabled,
      metadata: userRecord.metadata
    }));

    res.json({
      success: true,
      users,
      nextPageToken: listUsersResult.pageToken || null
    });
  } catch (error) {
    console.error('Error fetching Firebase users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching Firebase users'
    });
  }
});

// Get user by ID
router.get('/:userId', authenticateAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user'
    });
  }
});

// Update user
router.put('/:userId', authenticateAdmin, async (req, res) => {
  try {
    const { email, displayName, photoURL } = req.body;
    const uid = req.params.userId;

    // Update user in Firebase Authentication
    await admin.auth().updateUser(uid, {
      email,
      displayName,
      photoURL
    });

    // Optionally, update user in MongoDB if needed
    const user = await User.findOneAndUpdate(
      { uid },
      {
        email,
        displayName,
        photoURL,
        updatedAt: new Date()
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating user'
    });
  }
});

// Delete user
router.delete('/:userId', authenticateAdmin, async (req, res) => {
  try {
    const uid = req.params.userId;
    console.log('Delete user request received for UID:', uid);

    // Delete user from Firebase Authentication
    await admin.auth().deleteUser(uid);
    console.log('Deleted user from Firebase Authentication:', uid);

    // Do NOT delete user from MongoDB to avoid errors if user not synced
    // await User.findOneAndDelete({ uid });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting user',
      error: error.message
    });
  }
});

// Search users
router.get('/search/:query', authenticateAdmin, async (req, res) => {
  try {
    const query = req.params.query;
    const users = await User.find({
      $or: [
        { email: { $regex: query, $options: 'i' } },
        { displayName: { $regex: query, $options: 'i' } }
      ]
    }).select('-profilePicture.data').limit(20);

    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error searching users'
    });
  }
});

// Get user statistics
router.get('/stats/overview', authenticateAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        recentUsers
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching stats'
    });
  }
});

module.exports = router;
