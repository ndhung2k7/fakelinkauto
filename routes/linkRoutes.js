const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const LinkController = require('../controllers/linkController');
const { authenticate } = require('../middleware/auth');
const { createLinkLimiter } = require('../middleware/rateLimit');

// Validation rules
const createLinkValidation = [
  body('originalUrl').isURL().withMessage('Invalid URL format'),
  body('customSlug').optional().isLength({ min: 3, max: 50 }).matches(/^[a-zA-Z0-9_-]+$/),
  body('expiresAt').optional().isISO8601(),
  body('title').optional().isLength({ max: 200 }),
  body('description').optional().isLength({ max: 500 }),
  body('tags').optional().isArray()
];

const updateLinkValidation = [
  body('originalUrl').optional().isURL(),
  body('title').optional().isLength({ max: 200 }),
  body('description').optional().isLength({ max: 500 }),
  body('expiresAt').optional().isISO8601(),
  body('tags').optional().isArray(),
  body('isActive').optional().isBoolean()
];

// All routes require authentication
router.use(authenticate);

// Link management
router.post('/', createLinkLimiter, createLinkValidation, LinkController.createLink);
router.get('/', LinkController.getUserLinks);
router.get('/:id', LinkController.getLink);
router.put('/:id', updateLinkValidation, LinkController.updateLink);
router.delete('/:id', LinkController.deleteLink);

module.exports = router;
