const { User, Link, Click } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

class AdminController {
  // Get system statistics
  static async getSystemStats(req, res) {
    try {
      const totalUsers = await User.count();
      const totalLinks = await Link.count();
      const totalClicks = await Click.count();
      const activeUsers = await User.count({ where: { isActive: true } });
      
      // Links created in last 24 hours
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const newLinks24h = await Link.count({
        where: { createdAt: { [Op.gte]: last24Hours } }
      });
      
      // Clicks in last 24 hours
      const clicks24h = await Click.count({
        where: { timestamp: { [Op.gte]: last24Hours } }
      });
      
      // Top users by link count
      const topUsers = await User.findAll({
        attributes: [
          'id',
          'name',
          'email',
          [sequelize.fn('COUNT', sequelize.col('Links.id')), 'linkCount']
        ],
        include: [{
          model: Link,
          attributes: []
        }],
        group: ['User.id'],
        order: [[sequelize.fn('COUNT', sequelize.col('Links.id')), 'DESC']],
        limit: 10
      });
      
      // Database size (PostgreSQL only)
      let dbSize = null;
      if (process.env.NODE_ENV === 'production') {
        const [result] = await sequelize.query(`
          SELECT pg_database_size(current_database()) as size
        `);
        dbSize = result[0]?.size;
      }
      
      res.json({
        success: true,
        data: {
          totalUsers,
          totalLinks,
          totalClicks,
          activeUsers,
          newLinks24h,
          clicks24h,
          topUsers: topUsers.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            linkCount: parseInt(u.getDataValue('linkCount'))
          })),
          dbSize
        }
      });
    } catch (error) {
      console.error('Get system stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get system statistics'
      });
    }
  }
  
  // Get all users (with pagination)
  static async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 50, search = '' } = req.query;
      const offset = (page - 1) * limit;
      
      const where = search ? {
        [Op.or]: [
          { email: { [Op.like]: `%${search}%` } },
          { name: { [Op.like]: `%${search}%` } }
        ]
      } : {};
      
      const { count, rows: users } = await User.findAndCountAll({
        where,
        attributes: { exclude: ['password'] },
        include: [{
          model: Link,
          attributes: ['id', 'slug', 'clicks']
        }],
        limit: parseInt(limit),
        offset,
        order: [['createdAt', 'DESC']]
      });
      
      res.json({
        success: true,
        data: {
          users: users.map(user => ({
            ...user.toJSON(),
            totalLinks: user.Links.length,
            totalClicks: user.Links.reduce((sum, link) => sum + link.clicks, 0)
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            pages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get users'
      });
    }
  }
  
  // Get user details
  static async getUserDetails(req, res) {
    try {
      const { userId } = req.params;
      
      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password'] },
        include: [{
          model: Link,
          include: [{
            model: Click,
            limit: 10,
            order: [['timestamp', 'DESC']]
          }]
        }]
      });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      // Calculate statistics
      const totalLinks = user.Links.length;
      const totalClicks = user.Links.reduce((sum, link) => sum + link.clicks, 0);
      
      res.json({
        success: true,
        data: {
          ...user.toJSON(),
          totalLinks,
          totalClicks,
          averageClicksPerLink: totalLinks > 0 ? totalClicks / totalLinks : 0
        }
      });
    } catch (error) {
      console.error('Get user details error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user details'
      });
    }
  }
  
  // Update user (admin)
  static async updateUser(req, res) {
    try {
      const { userId } = req.params;
      const { role, plan, linksLimit, clicksLimit, isActive } = req.body;
      
      const user = await User.findByPk(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      const updates = {};
      if (role) updates.role = role;
      if (plan) updates.plan = plan;
      if (linksLimit) updates.linksLimit = linksLimit;
      if (clicksLimit) updates.clicksLimit = clicksLimit;
      if (typeof isActive !== 'undefined') updates.isActive = isActive;
      
      await user.update(updates);
      
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update user'
      });
    }
  }
  
  // Delete user
  static async deleteUser(req, res) {
    try {
      const { userId } = req.params;
      
      const user = await User.findByPk(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      await user.destroy();
      
      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete user'
      });
    }
  }
  
  // Get all links (admin)
  static async getAllLinks(req, res) {
    try {
      const { page = 1, limit = 50, search = '' } = req.query;
      const offset = (page - 1) * limit;
      
      const where = search ? {
        [Op.or]: [
          { slug: { [Op.like]: `%${search}%` } },
          { originalUrl: { [Op.like]: `%${search}%` } }
        ]
      } : {};
      
      const { count, rows: links } = await Link.findAndCountAll({
        where,
        include: [{
          model: User,
          attributes: ['id', 'name', 'email']
        }],
        limit: parseInt(limit),
        offset,
        order: [['createdAt', 'DESC']]
      });
      
      res.json({
        success: true,
        data: {
          links,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: count,
            pages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get all links error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get links'
      });
    }
  }
  
  // Delete link (admin)
  static async deleteLink(req, res) {
    try {
      const { linkId } = req.params;
      
      const link = await Link.findByPk(linkId);
      
      if (!link) {
        return res.status(404).json({
          success: false,
          error: 'Link not found'
        });
      }
      
      await link.destroy();
      
      res.json({
        success: true,
        message: 'Link deleted successfully'
      });
    } catch (error) {
      console.error('Delete link error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete link'
      });
    }
  }
  
  // Get recent activity
  static async getRecentActivity(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 20;
      
      const recentClicks = await Click.findAll({
        include: [{
          model: Link,
          include: [{
            model: User,
            attributes: ['id', 'name', 'email']
          }]
        }],
        order: [['timestamp', 'DESC']],
        limit
      });
      
      const recentLinks = await Link.findAll({
        include: [{
          model: User,
          attributes: ['id', 'name', 'email']
        }],
        order: [['createdAt', 'DESC']],
        limit
      });
      
      res.json({
        success: true,
        data: {
          recentClicks,
          recentLinks
        }
      });
    } catch (error) {
      console.error('Get recent activity error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get recent activity'
      });
    }
  }
}

module.exports = AdminController;
