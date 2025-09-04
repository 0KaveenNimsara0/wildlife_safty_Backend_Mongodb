const User = require('../models/User');

// Helper function to decode JWT token
const decodeJWT = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    // Firebase uses URL-safe base64, so we need to convert it to standard base64
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
    return payload;
  } catch (error) {
    console.error('JWT decode error:', error);
    throw new Error('Failed to decode JWT');
  }
};

// Authentication middleware for chat routes using Firebase JWT
const authenticateUserMongo = async (req, res, next) => {
  try {
    // Expect Firebase JWT in Authorization header as "Bearer <jwtToken>"
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: Missing token' });
    }

    const token = authHeader.split('Bearer ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    // Decode JWT to extract user_id
    const decoded = decodeJWT(token);

    // Extract user_id from Firebase JWT payload
    const firebaseUid = decoded.user_id || decoded.sub;
    if (!firebaseUid) {
      return res.status(401).json({ message: 'Unauthorized: No user ID in token' });
    }

    // Attach Firebase UID as user ID
    req.user = {
      uid: firebaseUid,
      email: decoded.email,
      name: decoded.name
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ message: 'Server error during authentication' });
  }
};

module.exports = { authenticateUserMongo };
