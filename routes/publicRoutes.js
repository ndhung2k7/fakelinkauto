const express = require('express');
const router = express.Router();
const { Link, Click } = require('../models');
const AnalyticsService = require('../services/analyticsService');
const { getCachedLink, cacheLink } = require('../services/cacheService');
const { optionalAuth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiter for redirects
const redirectLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 redirects per minute per IP
  message: 'Too many redirects, please try again later.'
});

// Redirect to original URL
router.get('/:slug', redirectLimiter, optionalAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    
    // Check cache first
    let link = await getCachedLink(slug);
    
    if (!link) {
      // Get from database
      link = await Link.findOne({
        where: { slug, isActive: true }
      });
      
      if (link) {
        // Cache for future requests
        await cacheLink(slug, link, 3600);
      }
    }
    
    if (!link) {
      return res.status(404).sendFile('index.html', { root: './public' });
    }
    
    // Check if link is expired
    if (link.expiresAt && new Date() > new Date(link.expiresAt)) {
      return res.status(410).send('This link has expired');
    }
    
    // Record click asynchronously
    AnalyticsService.recordClick(link.id, req).catch(console.error);
    
    // Redirect to original URL
    res.redirect(302, link.originalUrl);
  } catch (error) {
    console.error('Redirect error:', error);
    res.status(500).send('Internal server error');
  }
});

// API info
router.get('/', (req, res) => {
  res.json({
    name: process.env.APP_NAME,
    version: process.env.API_VERSION,
    documentation: `${process.env.BASE_URL}/api/docs`,
    endpoints: {
      auth: '/api/v1/auth',
      links: '/api/v1/links',
      analytics: '/api/v1/analytics'
    }
  });
});

module.exports = router;
