const express = require('express');
const Article = require('../models/Article');
const { authenticateMedicalOfficer } = require('../middleware/auth_medical_officer');
const { authenticateAdmin } = require('./adminAuth');

const router = express.Router();

// Get articles created by medical officer
router.get('/my-articles', authenticateMedicalOfficer, async (req, res) => {
  try {
    const medicalOfficerId = req.medicalOfficer._id.toString();

    const articles = await Article.find({
      'author.id': medicalOfficerId,
      'author.type': 'medical_officer'
    })
    .sort({ createdAt: -1 })
    .select('title excerpt status category tags createdAt updatedAt viewCount likeCount');

    res.json({
      success: true,
      articles
    });
  } catch (error) {
    console.error('Get my articles error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get single article by ID for medical officer
router.get('/:articleId', authenticateMedicalOfficer, async (req, res) => {
  try {
    const medicalOfficerId = req.medicalOfficer._id.toString();
    const { articleId } = req.params;

    const article = await Article.findOne({
      _id: articleId,
      'author.id': medicalOfficerId,
      'author.type': 'medical_officer'
    });

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
      message: 'Server error'
    });
  }
});

// Create new article
router.post('/', authenticateMedicalOfficer, async (req, res) => {
  try {
    const { title, content, excerpt, category, tags, images } = req.body;
    const medicalOfficer = req.medicalOfficer;

    if (!title || !content || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, content, and category are required'
      });
    }

    // Validate category enum
    const validCategories = ['wildlife_safety', 'medical_advice', 'emergency_response', 'prevention', 'treatment'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Allowed values are: ${validCategories.join(', ')}`
      });
    }

    // Ensure images is an array of objects
    let processedImages = [];
    if (Array.isArray(images)) {
      processedImages = images.filter(img => typeof img === 'object' && img !== null);
    }

    const newArticle = new Article({
      title: title.trim(),
      content: content.trim(),
      excerpt: excerpt ? excerpt.trim() : '',
      author: {
        id: medicalOfficer._id.toString(),
        name: medicalOfficer.name,
        email: medicalOfficer.email,
        type: 'medical_officer'
      },
      category,
      tags: Array.isArray(tags) ? tags : [],
      images: processedImages,
      status: 'draft'
    });

    await newArticle.save();

    res.status(201).json({
      success: true,
      message: 'Article created successfully',
      article: newArticle
    });
  } catch (error) {
    console.error('Create article error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update article
router.put('/:articleId', authenticateMedicalOfficer, async (req, res) => {
  try {
    const { articleId } = req.params;
    const { title, content, excerpt, category, tags, images } = req.body;
    const medicalOfficerId = req.medicalOfficer._id.toString();

    const article = await Article.findById(articleId);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    if (article.author.id !== medicalOfficerId || article.author.type !== 'medical_officer') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (article.status === 'published') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit published articles'
      });
    }

    if (title) article.title = title.trim();
    if (content) article.content = content.trim();
    if (excerpt !== undefined) article.excerpt = excerpt ? excerpt.trim() : '';
    if (category) article.category = category;
    if (tags) article.tags = tags;
    if (images) article.images = images;

    await article.save();

    res.json({
      success: true,
      message: 'Article updated successfully',
      article
    });
  } catch (error) {
    console.error('Update article error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Submit article for review
router.post('/:articleId/submit', authenticateMedicalOfficer, async (req, res) => {
  try {
    const { articleId } = req.params;
    const medicalOfficerId = req.medicalOfficer._id.toString();

    const article = await Article.findById(articleId);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    if (article.author.id !== medicalOfficerId || article.author.type !== 'medical_officer') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (article.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Article is not in draft status'
      });
    }

    article.status = 'pending_review';
    await article.save();

    res.json({
      success: true,
      message: 'Article submitted for review',
      article
    });
  } catch (error) {
    console.error('Submit article error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Delete article
router.delete('/:articleId', authenticateMedicalOfficer, async (req, res) => {
  try {
    const { articleId } = req.params;
    const medicalOfficerId = req.medicalOfficer._id.toString();

    const article = await Article.findById(articleId);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    if (article.author.id !== medicalOfficerId || article.author.type !== 'medical_officer') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (article.status === 'published') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete published articles'
      });
    }

    await Article.findByIdAndDelete(articleId);

    res.json({
      success: true,
      message: 'Article deleted successfully'
    });
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get articles for admin review
router.get('/admin/articles', authenticateAdmin, async (req, res) => {
  try {
    const { status = 'pending_review' } = req.query;

    const articles = await Article.find({ status })
      .populate('author')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      articles
    });
  } catch (error) {
    console.error('Get articles for review error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Admin approve/reject article
router.put('/admin/articles/:articleId/review', authenticateAdmin, async (req, res) => {
  try {
    const { articleId } = req.params;
    const { action, comments } = req.body; // action: 'approve' or 'reject'
    const admin = req.admin;

    const article = await Article.findById(articleId);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    if (article.status !== 'pending_review') {
      return res.status(400).json({
        success: false,
        message: 'Article is not pending review'
      });
    }

    article.reviewer = {
      id: admin._id.toString(),
      name: admin.name,
      type: 'admin',
      reviewedAt: new Date(),
      comments: comments || ''
    };

    if (action === 'approve') {
      article.status = 'approved';
    } else if (action === 'reject') {
      article.status = 'rejected';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action'
      });
    }

    await article.save();

    res.json({
      success: true,
      message: `Article ${action}d successfully`,
      article
    });
  } catch (error) {
    console.error('Review article error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Admin publish approved article
router.post('/admin/articles/:articleId/publish', authenticateAdmin, async (req, res) => {
  try {
    const { articleId } = req.params;
    const admin = req.admin;

    const article = await Article.findById(articleId);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    if (article.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Article is not approved'
      });
    }

    article.status = 'published';
    article.publishedAt = new Date();

    await article.save();

    res.json({
      success: true,
      message: 'Article published successfully',
      article
    });
  } catch (error) {
    console.error('Publish article error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/* The rest of the file remains unchanged */

module.exports = router;
