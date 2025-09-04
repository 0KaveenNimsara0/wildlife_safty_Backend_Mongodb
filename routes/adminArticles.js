const express = require('express');
const router = express.Router();
const Article = require('../models/Article');
const { authenticateAdmin } = require('./adminAuth');

// Get all articles
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const articles = await Article.find()
      .populate('author', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalArticles = await Article.countDocuments();

    res.json({
      success: true,
      articles,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalArticles / limit),
        totalArticles,
        hasNext: page * limit < totalArticles,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get articles error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching articles'
    });
  }
});

// Get article by ID
router.get('/:articleId', authenticateAdmin, async (req, res) => {
  try {
    const article = await Article.findById(req.params.articleId)
      .populate('author', 'name email');

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    res.json({
      success: true,
      article
    });
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching article'
    });
  }
});

// Approve article
router.put('/:articleId/approve', authenticateAdmin, async (req, res) => {
  try {
    const article = await Article.findByIdAndUpdate(
      req.params.articleId,
      {
        status: 'approved',
        approvedBy: req.admin._id,
        approvedAt: new Date()
      },
      { new: true }
    ).populate('author', 'name email');

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    res.json({
      success: true,
      message: 'Article approved successfully',
      article
    });
  } catch (error) {
    console.error('Approve article error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error approving article'
    });
  }
});

// Reject article
router.put('/:articleId/reject', authenticateAdmin, async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    const article = await Article.findByIdAndUpdate(
      req.params.articleId,
      {
        status: 'rejected',
        rejectionReason: rejectionReason || 'Article rejected by admin',
        rejectedBy: req.admin._id,
        rejectedAt: new Date()
      },
      { new: true }
    ).populate('author', 'name email');

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    res.json({
      success: true,
      message: 'Article rejected successfully',
      article
    });
  } catch (error) {
    console.error('Reject article error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error rejecting article'
    });
  }
});

// Delete article
router.delete('/:articleId', authenticateAdmin, async (req, res) => {
  try {
    const article = await Article.findByIdAndDelete(req.params.articleId);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    res.json({
      success: true,
      message: 'Article deleted successfully'
    });
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting article'
    });
  }
});

// Get articles by status
router.get('/status/:status', authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const articles = await Article.find({ status })
      .populate('author', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalArticles = await Article.countDocuments({ status });

    res.json({
      success: true,
      articles,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalArticles / limit),
        totalArticles,
        hasNext: page * limit < totalArticles,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get articles by status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching articles by status'
    });
  }
});

module.exports = router;
