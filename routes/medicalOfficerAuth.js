const express = require('express');
const jwt = require('jsonwebtoken');
const MedicalOfficer = require('../models/MedicalOfficer');
const { authenticateMedicalOfficer } = require('../middleware/auth_medical_officer');

const router = express.Router();

// Generate JWT token
const generateToken = (medicalOfficerId) => {
  return jwt.sign({ medicalOfficerId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '30d'
  });
};

// Medical officer login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const medicalOfficer = await MedicalOfficer.findOne({ email: email.toLowerCase() });

    if (!medicalOfficer) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!medicalOfficer.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    if (!medicalOfficer.isApproved) {
      return res.status(401).json({
        success: false,
        message: 'Account is pending approval'
      });
    }

    const isPasswordValid = await medicalOfficer.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    medicalOfficer.lastLogin = new Date();
    await medicalOfficer.save();

    const token = generateToken(medicalOfficer._id);

    res.json({
      success: true,
      message: 'Login successful',
      medicalOfficer: {
        id: medicalOfficer._id,
        email: medicalOfficer.email,
        name: medicalOfficer.name,
        specialization: medicalOfficer.specialization,
        licenseNumber: medicalOfficer.licenseNumber
      },
      token
    });
  } catch (error) {
    console.error('Medical officer login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Medical officer registration
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, specialization, licenseNumber, phoneNumber, hospital } = req.body;

    if (!email || !password || password.length < 6 || !name || !specialization || !licenseNumber) {
      return res.status(400).json({
        success: false,
        message: 'Email, password (min 6 chars), name, specialization, and license number are required'
      });
    }

    // Check if medical officer already exists
    const existingMedicalOfficer = await MedicalOfficer.findOne({
      $or: [
        { email: email.toLowerCase() },
        { licenseNumber: licenseNumber }
      ]
    });

    if (existingMedicalOfficer) {
      return res.status(400).json({
        success: false,
        message: 'Medical officer with this email or license number already exists'
      });
    }

    const newMedicalOfficer = new MedicalOfficer({
      email: email.toLowerCase(),
      password,
      name,
      specialization,
      licenseNumber,
      phoneNumber,
      hospital
    });

    await newMedicalOfficer.save();

    const token = generateToken(newMedicalOfficer._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Your account is pending admin approval.',
      medicalOfficer: {
        id: newMedicalOfficer._id,
        email: newMedicalOfficer.email,
        name: newMedicalOfficer.name,
        specialization: newMedicalOfficer.specialization,
        licenseNumber: newMedicalOfficer.licenseNumber
      },
      token
    });
  } catch (error) {
    console.error('Medical officer registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});



// Get current medical officer profile
router.get('/profile', authenticateMedicalOfficer, async (req, res) => {
  res.json({
    success: true,
    medicalOfficer: {
      id: req.medicalOfficer._id,
      email: req.medicalOfficer.email,
      name: req.medicalOfficer.name,
      specialization: req.medicalOfficer.specialization,
      licenseNumber: req.medicalOfficer.licenseNumber,
      phoneNumber: req.medicalOfficer.phoneNumber,
      hospital: req.medicalOfficer.hospital,
      lastLogin: req.medicalOfficer.lastLogin
    }
  });
});

// Update medical officer profile
router.put('/profile', authenticateMedicalOfficer, async (req, res) => {
  try {
    const { name, phoneNumber, hospital } = req.body;

    const medicalOfficer = req.medicalOfficer;
    if (name) medicalOfficer.name = name;
    if (phoneNumber) medicalOfficer.phoneNumber = phoneNumber;
    if (hospital) medicalOfficer.hospital = hospital;

    await medicalOfficer.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      medicalOfficer: {
        id: medicalOfficer._id,
        email: medicalOfficer.email,
        name: medicalOfficer.name,
        specialization: medicalOfficer.specialization,
        licenseNumber: medicalOfficer.licenseNumber,
        phoneNumber: medicalOfficer.phoneNumber,
        hospital: medicalOfficer.hospital
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during profile update'
    });
  }
});

module.exports = { router, authenticateMedicalOfficer };
