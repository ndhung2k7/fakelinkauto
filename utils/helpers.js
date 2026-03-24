const crypto = require('crypto');

// Generate random string
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Validate URL
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Format short URL
const formatShortUrl = (slug, customDomain = null) => {
  const baseUrl = customDomain || process.env.BASE_URL;
  return `${baseUrl}/${slug}`;
};

// Parse user agent
const parseUserAgent = (userAgent) => {
  const ua = useragent.parse(userAgent);
  return {
    browser: ua.family,
    version: ua.toVersion(),
    os: ua.os.toString(),
    device: ua.device.toString(),
    isMobile: ua.isMobile,
    isTablet: ua.isTablet,
    isDesktop: ua.isDesktop
  };
};

// Format date
const formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  const d = new Date(date);
  return d.toISOString().replace('T', ' ').substring(0, 19);
};

// Generate QR code URL
const generateQRCode = (url, size = 200) => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;
};

// Check if link is expired
const isLinkExpired = (expiresAt) => {
  if (!expiresAt) return false;
  return new Date() > new Date(expiresAt);
};

// Mask sensitive data
const maskEmail = (email) => {
  const [local, domain] = email.split('@');
  const maskedLocal = local.slice(0, 2) + '*'.repeat(local.length - 2);
  return `${maskedLocal}@${domain}`;
};

module.exports = {
  generateRandomString,
  isValidUrl,
  formatShortUrl,
  parseUserAgent,
  formatDate,
  generateQRCode,
  isLinkExpired,
  maskEmail
};
