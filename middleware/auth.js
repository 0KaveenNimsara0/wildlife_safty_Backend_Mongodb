const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = require('../firebase-service-account.json'); // You'll need to add this file
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// Middleware to authenticate Firebase users
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.name || decodedToken.email
    };

    next();
  } catch (error) {
    console.error('Firebase auth error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

module.exports = {
  authenticateUser
};
