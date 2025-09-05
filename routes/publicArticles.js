const express = require('express');
const router = express.Router();
const Article = require('../models/Article');

// Public API to get published articles by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const validCategories = ['wildlife_safety', 'medical_advice', 'emergency_response', 'prevention', 'treatment'];

    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }

    const articles = await Article.find({ category, status: 'published' })
      .sort({ createdAt: -1 })
      .select('title excerpt content images createdAt');

    res.json({
      success: true,
      articles
    });
  } catch (error) {
    console.error('Get articles by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching articles by category'
    });
  }
});

module.exports = router;
