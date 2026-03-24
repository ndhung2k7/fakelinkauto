module.exports = {
  // User roles
  ROLES: {
    USER: 'user',
    ADMIN: 'admin'
  },
  
  // Subscription plans
  PLANS: {
    FREE: {
      name: 'free',
      linksLimit: 10,
      clicksLimit: 1000,
      customDomain: false,
      analytics: false,
      apiAccess: true,
      price: 0
    },
    PRO: {
      name: 'pro',
      linksLimit: 500,
      clicksLimit: 100000,
      customDomain: true,
      analytics: true,
      apiAccess: true,
      price: 9.99
    },
    ENTERPRISE: {
      name: 'enterprise',
      linksLimit: -1, // Unlimited
      clicksLimit: -1, // Unlimited
      customDomain: true,
      analytics: true,
      apiAccess: true,
      price: 49.99
    }
  },
  
  // Link status
  LINK_STATUS: {
    ACTIVE: 'active',
    EXPIRED: 'expired',
    DISABLED: 'disabled'
  },
  
  // Analytics types
  ANALYTICS_TYPES: {
    CLICKS: 'clicks',
    DEVICES: 'devices',
    BROWSERS: 'browsers',
    COUNTRIES: 'countries',
    REFERRERS: 'referrers',
    DAILY: 'daily'
  },
  
  // Rate limit configurations
  RATE_LIMITS: {
    PUBLIC: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100
    },
    AUTH: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5
    },
    API: {
      windowMs: 60 * 1000, // 1 minute
      max: 60
    }
  },
  
  // Cache TTL (seconds)
  CACHE_TTL: {
    LINK: 3600, // 1 hour
    ANALYTICS: 300, // 5 minutes
    USER: 1800 // 30 minutes
  },
  
  // Validation rules
  VALIDATION: {
    SLUG_MIN_LENGTH: 3,
    SLUG_MAX_LENGTH: 50,
    SLUG_PATTERN: /^[a-zA-Z0-9_-]+$/,
    PASSWORD_MIN_LENGTH: 6,
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 50
  }
};
