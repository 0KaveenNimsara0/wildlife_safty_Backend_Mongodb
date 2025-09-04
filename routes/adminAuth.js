const express = require('express');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const router = express.Router();

// Generate JWT token
const generateToken = (adminId) => {
  return jwt.sign({ adminId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '24h'
  });
};

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    const isPasswordValid = await admin.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    const token = generateToken(admin._id);

    res.json({
      success: true,
      message: 'Login successful',
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      },
      token
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Admin registration (only for superadmin or first admin)
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this email already exists'
      });
    }

    // Check if this is the first admin (allow superadmin role)
    const adminCount = await Admin.countDocuments();
    const adminRole = adminCount === 0 ? 'superadmin' : (role || 'admin');

    const newAdmin = new Admin({
      email: email.toLowerCase(),
      password,
      name,
      role: adminRole
    });

    await newAdmin.save();

    const token = generateToken(newAdmin._id);

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      admin: {
        id: newAdmin._id,
        email: newAdmin.email,
        name: newAdmin.name,
        role: newAdmin.role
      },
      token
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// Verify token middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const admin = await Admin.findById(decoded.adminId);

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or admin deactivated'
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Get current admin profile
router.get('/profile', authenticateAdmin, async (req, res) => {
  res.json({
    success: true,
    admin: {
      id: req.admin._id,
      email: req.admin.email,
      name: req.admin.name,
      role: req.admin.role,
      lastLogin: req.admin.lastLogin
    }
  });
});

module.exports = { router, authenticateAdmin };
