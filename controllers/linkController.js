const { Link } = require('../models');
const { validationResult } = require('express-validator');
const { invalidateCache, cacheLink } = require('../services/cacheService');
const { nanoid } = require('nanoid');
const { Op } = require('sequelize');

class LinkController {
  // Create new link
  static async createLink(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }
      
      const { originalUrl, customSlug, expiresAt, title, description, tags } = req.body;
      
      // Check user's link limit
      const userLinksCount = await Link.count({ where: { userId: req.user.id } });
      if (userLinksCount >= req.user.linksLimit) {
        return res.status(403).json({
          success: false,
          error: `Link limit reached. Upgrade your plan to create more links. Current limit: ${req.user.linksLimit}`
        });
      }
      
      // Check if custom slug is already taken
      let slug = customSlug;
      if (slug) {
        const existingLink = await Link.findOne({ where: { slug } });
        if (existingLink) {
          return res.status(400).json({
            success: false,
            error: 'Custom slug already taken'
          });
        }
      } else {
        // Generate unique slug
        let isUnique = false;
        while (!isUnique) {
          slug = nanoid(6);
          const existing = await Link.findOne({ where: { slug } });
          if (!existing) isUnique = true;
        }
      }
      
      // Create link
      const link = await Link.create({
        slug,
        originalUrl,
        userId: req.user.id,
        expiresAt: expiresAt || null,
        title,
        description,
        tags: tags || []
      });
      
      // Cache the new link
      await cacheLink(slug, link, 3600);
      
      res.status(201).json({
        success: true,
        data: {
          id: link.id,
          slug: link.slug,
          shortUrl: `${process.env.BASE_URL}/${link.slug}`,
          originalUrl: link.originalUrl,
          expiresAt: link.expiresAt,
          clicks: link.clicks,
          createdAt: link.createdAt
        }
      });
    } catch (error) {
      console.error('Create link error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create link'
      });
    }
  }
  
  // Get user's links
  static async getUserLinks(req, res) {
    try {
      const { page = 1, limit = 20, search = '' } = req.query;
      const offset = (page - 1) * limit;
      
      const where = {
        userId: req.user.id,
        ...(search && {
          [Op.or]: [
            { originalUrl: { [Op.like]: `%${search}%` } },
            { slug: { [Op.like]: `%${search}%` } },
            { title: { [Op.like]: `%${search}%` } }
          ]
        })
      };
      
      const { count, rows: links } = await Link.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset
      });
      
      res.json({
        success: true,
        data: {
          links: links.map(link => ({
            id: link.id,
            slug: link.slug,
            shortUrl: `${process.env.BASE_URL}/${link.slug}`,
            originalUrl: link.originalUrl,
            title: link.title,
            description: link.description,
            clicks: link.clicks,
            expiresAt: link.expiresAt,
            isActive: link.isActive,
            tags: link.tags,
            createdAt: link.createdAt
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
      console.error('Get user links error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get links'
      });
    }
  }
  
  // Get single link
  static async getLink(req, res) {
    try {
      const { id } = req.params;
      
      const link = await Link.findOne({
        where: {
          id,
          userId: req.user.id
        }
      });
      
      if (!link) {
        return res.status(404).json({
          success: false,
          error: 'Link not found'
        });
      }
      
      res.json({
        success: true,
        data: {
          id: link.id,
          slug: link.slug,
          shortUrl: `${process.env.BASE_URL}/${link.slug}`,
          originalUrl: link.originalUrl,
          title: link.title,
          description: link.description,
          clicks: link.clicks,
          expiresAt: link.expiresAt,
          isActive: link.isActive,
          tags: link.tags,
          createdAt: link.createdAt,
          updatedAt: link.updatedAt
        }
      });
    } catch (error) {
      console.error('Get link error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get link'
      });
    }
  }
  
  // Update link
  static async updateLink(req, res) {
    try {
      const { id } = req.params;
      const { originalUrl, title, description, expiresAt, tags, isActive } = req.body;
      
      const link = await Link.findOne({
        where: {
          id,
          userId: req.user.id
        }
      });
      
      if (!link) {
        return res.status(404).json({
          success: false,
          error: 'Link not found'
        });
      }
      
      // Update fields
      if (originalUrl) link.originalUrl = originalUrl;
      if (title) link.title = title;
      if (description) link.description = description;
      if (expiresAt) link.expiresAt = expiresAt;
      if (tags) link.tags = tags;
      if (typeof isActive !== 'undefined') link.isActive = isActive;
      
      await link.save();
      
      // Invalidate cache
      await invalidateCache(link.slug);
      await cacheLink(link.slug, link, 3600);
      
      res.json({
        success: true,
        data: link
      });
    } catch (error) {
      console.error('Update link error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update link'
      });
    }
  }
  
  // Delete link
  static async deleteLink(req, res) {
    try {
      const { id } = req.params;
      
      const link = await Link.findOne({
        where: {
          id,
          userId: req.user.id
        }
      });
      
      if (!link) {
        return res.status(404).json({
          success: false,
          error: 'Link not found'
        });
      }
      
      await link.destroy();
      
      // Invalidate cache
      await invalidateCache(link.slug);
      
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
  
  // Get link stats (for public API)
  static async getLinkStats(req, res) {
    try {
      const { slug } = req.params;
      
      const link = await Link.findOne({
        where: { slug },
        attributes: ['id', 'slug', 'originalUrl', 'clicks', 'createdAt']
      });
      
      if (!link) {
        return res.status(404).json({
          success: false,
          error: 'Link not found'
        });
      }
      
      res.json({
        success: true,
        data: {
          slug: link.slug,
          originalUrl: link.originalUrl,
          clicks: link.clicks,
          createdAt: link.createdAt
        }
      });
    } catch (error) {
      console.error('Get link stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get link stats'
      });
    }
  }
}

module.exports = LinkController;
