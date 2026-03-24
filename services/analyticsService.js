const { Click, Link } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const useragent = require('useragent');
const geoip = require('geoip-lite');

class AnalyticsService {
  // Record a click
  static async recordClick(linkId, req) {
    try {
      // Parse user agent
      const agent = useragent.parse(req.headers['user-agent']);
      const device = this.detectDevice(agent);
      
      // Get geo location from IP
      const ip = req.ip || req.connection.remoteAddress;
      const geo = geoip.lookup(ip);
      
      const clickData = {
        linkId,
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
        referrer: req.headers.referer || req.headers.referrer,
        country: geo?.country,
        city: geo?.city,
        device: device.type,
        browser: agent.family,
        os: agent.os.toString(),
        timestamp: new Date()
      };
      
      // Async save click (don't await for performance)
      Click.create(clickData).catch(err => console.error('Click save error:', err));
      
      // Increment link click count
      await Link.increment('clicks', { where: { id: linkId } });
      
      return true;
    } catch (error) {
      console.error('Error recording click:', error);
      return false;
    }
  }
  
  // Detect device type
  static detectDevice(agent) {
    if (agent.isMobile) return { type: 'mobile', name: agent.family };
    if (agent.isTablet) return { type: 'tablet', name: agent.family };
    if (agent.isDesktop) return { type: 'desktop', name: agent.family };
    return { type: 'other', name: agent.family };
  }
  
  // Get link analytics
  static async getLinkAnalytics(linkId, startDate = null, endDate = null) {
    try {
      const where = { linkId };
      
      if (startDate && endDate) {
        where.timestamp = {
          [Op.between]: [startDate, endDate]
        };
      }
      
      // Total clicks
      const totalClicks = await Click.count({ where });
      
      // Unique clicks (by IP)
      const uniqueClicks = await Click.count({
        where,
        distinct: true,
        col: 'ipAddress'
      });
      
      // Clicks by country
      const clicksByCountry = await Click.findAll({
        where,
        attributes: [
          'country',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['country'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        limit: 10
      });
      
      // Clicks by device
      const clicksByDevice = await Click.findAll({
        where,
        attributes: [
          'device',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['device']
      });
      
      // Clicks by browser
      const clicksByBrowser = await Click.findAll({
        where,
        attributes: [
          'browser',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['browser']
      });
      
      // Daily clicks (last 30 days)
      const dailyClicks = await Click.findAll({
        where: {
          ...where,
          timestamp: {
            [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        attributes: [
          [sequelize.fn('DATE', sequelize.col('timestamp')), 'date'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: [sequelize.fn('DATE', sequelize.col('timestamp'))],
        order: [[sequelize.fn('DATE', sequelize.col('timestamp')), 'ASC']]
      });
      
      // Top referrers
      const topReferrers = await Click.findAll({
        where: {
          ...where,
          referrer: { [Op.ne]: null }
        },
        attributes: [
          'referrer',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['referrer'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        limit: 10
      });
      
      return {
        totalClicks,
        uniqueClicks,
        clicksByCountry: clicksByCountry.map(c => ({
          country: c.country || 'Unknown',
          count: parseInt(c.getDataValue('count'))
        })),
        clicksByDevice: clicksByDevice.map(d => ({
          device: d.device || 'Unknown',
          count: parseInt(d.getDataValue('count'))
        })),
        clicksByBrowser: clicksByBrowser.map(b => ({
          browser: b.browser || 'Unknown',
          count: parseInt(b.getDataValue('count'))
        })),
        dailyClicks: dailyClicks.map(d => ({
          date: d.getDataValue('date'),
          count: parseInt(d.getDataValue('count'))
        })),
        topReferrers: topReferrers.map(r => ({
          referrer: r.referrer,
          count: parseInt(r.getDataValue('count'))
        }))
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  }
  
  // Get user overall analytics
  static async getUserAnalytics(userId) {
    try {
      const links = await Link.findAll({
        where: { userId },
        attributes: ['id', 'slug', 'originalUrl', 'clicks']
      });
      
      const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);
      const totalLinks = links.length;
      
      const topLinks = links
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10)
        .map(link => ({
          id: link.id,
          slug: link.slug,
          originalUrl: link.originalUrl,
          clicks: link.clicks
        }));
      
      return {
        totalLinks,
        totalClicks,
        topLinks,
        averageClicksPerLink: totalLinks > 0 ? totalClicks / totalLinks : 0
      };
    } catch (error) {
      console.error('Error getting user analytics:', error);
      throw error;
    }
  }
}

module.exports = AnalyticsService;
