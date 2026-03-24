const { body, param, query, validationResult } = require('express-validator');

const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }
    
    res.status(400).json({
      success: false,
      errors: errors.array()
    });
  };
};

// Common validations
const validations = {
  id: param('id').isUUID(),
  slug: param('slug').isLength({ min: 3, max: 50 }),
  page: query('page').optional().isInt({ min: 1 }),
  limit: query('limit').optional().isInt({ min: 1, max: 100 }),
  dateRange: [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ]
};

module.exports = { validate, validations };
