const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { redisClient } = require('../services/cacheService');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.'
  }
});

// Limiter for link creation
const createLinkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: {
    success: false,
    error: 'Link creation limit reached. Please upgrade your plan for more links.'
  }
});

// Redis-based distributed rate limiter for multi-server setup
const createRedisLimiter = (windowMs, max) => {
  if (process.env.NODE_ENV === 'production' && redisClient) {
    return rateLimit({
      store: new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
      }),
      windowMs,
      max,
      standardHeaders: true,
      legacyHeaders: false
    });
  }
  
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false
  });
};

module.exports = {
  apiLimiter,
  authLimiter,
  createLinkLimiter,
  createRedisLimiter
};
