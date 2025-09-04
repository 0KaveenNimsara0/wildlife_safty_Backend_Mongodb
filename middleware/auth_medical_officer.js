const jwt = require('jsonwebtoken');
const MedicalOfficer = require('../models/MedicalOfficer');

// Authentication middleware for medical officer routes using JWT
const authenticateMedicalOfficer = async (req, res, next) => {
  try {
    // Expect JWT token in Authorization header as "Bearer <token>"
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: Missing token' });
    }
    const token = authHeader.split('Bearer ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    // Decode JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    if (!decoded.medicalOfficerId) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token payload' });
    }

    // Find medical officer in MongoDB by ID from token
    const medicalOfficer = await MedicalOfficer.findById(decoded.medicalOfficerId);
    if (!medicalOfficer || !medicalOfficer.isActive || !medicalOfficer.isApproved) {
      return res.status(401).json({ message: 'Unauthorized: Medical officer not found or inactive' });
    }

    // Attach medical officer info to request
    req.medicalOfficer = {
      _id: medicalOfficer._id,
      name: medicalOfficer.name,
      email: medicalOfficer.email,
      specialization: medicalOfficer.specialization
    };

    next();
  } catch (error) {
    console.error('Medical officer authentication error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Unauthorized: Token expired' });
    }
    res.status(500).json({ message: 'Server error during authentication' });
  }
};

module.exports = { authenticateMedicalOfficer };
