const redis = require('redis');
const { promisify } = require('util');

let redisClient = null;
let isRedisAvailable = false;

// Initialize Redis connection
const initRedis = async () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('⚠️  Redis disabled in development mode');
    return null;
  }
  
  try {
    redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          console.error('❌ Redis connection refused');
          return new Error('Redis connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          return new Error('Redis retry time exhausted');
        }
        if (options.attempt > 10) {
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      }
    });
    
    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
      isRedisAvailable = true;
    });
    
    redisClient.on('error', (err) => {
      console.error('❌ Redis error:', err);
      isRedisAvailable = false;
    });
    
    await redisClient.connect();
    
    return redisClient;
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error.message);
    return null;
  }
};

// Cache middleware for redirects
const cacheRedirect = async (req, res, next) => {
  if (!isRedisAvailable) {
    return next();
  }
  
  const slug = req.params.slug;
  
  try {
    const cachedUrl = await redisClient.get(`redirect:${slug}`);
    
    if (cachedUrl) {
      // Record click async (don't wait for it)
      next();
      return;
    }
    
    next();
  } catch (error) {
    console.error('Cache error:', error);
    next();
  }
};

// Cache link data
const cacheLink = async (slug, linkData, ttl = 3600) => {
  if (!isRedisAvailable) return;
  
  try {
    await redisClient.setEx(`link:${slug}`, ttl, JSON.stringify(linkData));
  } catch (error) {
    console.error('Cache set error:', error);
  }
};

// Get cached link
const getCachedLink = async (slug) => {
  if (!isRedisAvailable) return null;
  
  try {
    const data = await redisClient.get(`link:${slug}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
};

// Invalidate cache
const invalidateCache = async (slug) => {
  if (!isRedisAvailable) return;
  
  try {
    await redisClient.del(`link:${slug}`);
    await redisClient.del(`redirect:${slug}`);
  } catch (error) {
    console.error('Cache invalidate error:', error);
  }
};

// Rate limiting with Redis
const checkRateLimit = async (key, limit, windowMs) => {
  if (!isRedisAvailable) return { allowed: true };
  
  try {
    const current = await redisClient.incr(key);
    
    if (current === 1) {
      await redisClient.expire(key, Math.ceil(windowMs / 1000));
    }
    
    const allowed = current <= limit;
    const remaining = allowed ? limit - current : 0;
    
    return {
      allowed,
      remaining,
      total: limit
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true };
  }
};

module.exports = {
  initRedis,
  redisClient,
  isRedisAvailable,
  cacheRedirect,
  cacheLink,
  getCachedLink,
  invalidateCache,
  checkRateLimit
};
