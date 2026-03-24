const AnalyticsService = require('../services/analyticsService');
const { Link } = require('../models');

class AnalyticsController {
  // Get analytics for a specific link
  static async getLinkAnalytics(req, res) {
    try {
      const { linkId } = req.params;
      const { startDate, endDate } = req.query;
      
      // Check if user owns the link
      const link = await Link.findOne({
        where: {
          id: linkId,
          userId: req.user.id
        }
      });
      
      if (!link) {
        return res.status(404).json({
          success: false,
          error: 'Link not found or access denied'
        });
      }
      
      const analytics = await AnalyticsService.getLinkAnalytics(
        linkId,
        startDate ? new Date(startDate) : null,
        endDate ? new Date(endDate) : null
      );
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Get link analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get analytics'
      });
    }
  }
  
  // Get user overall analytics
  static async getUserAnalytics(req, res) {
    try {
      const analytics = await AnalyticsService.getUserAnalytics(req.user.id);
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Get user analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user analytics'
      });
    }
  }
  
  // Get real-time analytics (last 24 hours)
  static async getRealtimeAnalytics(req, res) {
    try {
      const { linkId } = req.params;
      
      const link = await Link.findOne({
        where: {
          id: linkId,
          userId: req.user.id
        }
      });
      
      if (!link) {
        return res.status(404).json({
          success: false,
          error: 'Link not found'
        });
      }
      
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const analytics = await AnalyticsService.getLinkAnalytics(linkId, last24Hours);
      
      res.json({
        success: true,
        data: {
          realtime: analytics
        }
      });
    } catch (error) {
      console.error('Get realtime analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get realtime analytics'
      });
    }
  }
  
  // Export analytics data
  static async exportAnalytics(req, res) {
    try {
      const { linkId, format = 'json' } = req.query;
      
      const link = await Link.findOne({
        where: {
          id: linkId,
          userId: req.user.id
        }
      });
      
      if (!link) {
        return res.status(404).json({
          success: false,
          error: 'Link not found'
        });
      }
      
      const analytics = await AnalyticsService.getLinkAnalytics(linkId);
      
      if (format === 'csv') {
        // Convert to CSV
        const csv = this.convertToCSV(analytics);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=analytics_${link.slug}.csv`);
        return res.send(csv);
      }
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Export analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export analytics'
      });
    }
  }
  
  // Convert analytics to CSV
  static convertToCSV(analytics) {
    // Implementation for CSV conversion
    const rows = [
      ['Date', 'Clicks', 'Unique Clicks', 'Top Country', 'Top Device', 'Top Browser']
    ];
    
    analytics.dailyClicks.forEach(day => {
      rows.push([
        day.date,
        day.count,
        'N/A', // Would need separate unique clicks per day
        analytics.clicksByCountry[0]?.country || 'N/A',
        analytics.clicksByDevice[0]?.device || 'N/A',
        analytics.clicksByBrowser[0]?.browser || 'N/A'
      ]);
    });
    
    return rows.map(row => row.join(',')).join('\n');
  }
}

module.exports = AnalyticsController;
