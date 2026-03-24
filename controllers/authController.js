const { User } = require('../models');
const { generateTokens, refreshAccessToken } = require('../middleware/auth');
const { validationResult } = require('express-validator');
const crypto = require('crypto');

class AuthController {
  // Register new user
  static async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }
      
      const { email, password, name } = req.body;
      
      // Check if user exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Email already registered'
        });
      }
      
      // Create user
      const user = await User.create({
        email,
        password,
        name,
        plan: 'free',
        linksLimit: 10,
        clicksLimit: 1000
      });
      
      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user);
      
      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            plan: user.plan,
            apiKey: user.apiKey
          },
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Registration failed'
      });
    }
  }
  
  // Login user
  static async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }
      
      const { email, password } = req.body;
      
      // Find user
      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }
      
      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }
      
      // Update last login
      await user.update({ lastLogin: new Date() });
      
      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user);
      
      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            plan: user.plan,
            apiKey: user.apiKey
          },
          accessToken,
          refreshToken
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed'
      });
    }
  }
  
  // Refresh token
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'Refresh token required'
        });
      }
      
      const newAccessToken = await refreshAccessToken(refreshToken);
      
      res.json({
        success: true,
        accessToken: newAccessToken
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }
  }
  
  // Get current user
  static async getMe(req, res) {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] }
      });
      
      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user'
      });
    }
  }
  
  // Update user profile
  static async updateProfile(req, res) {
    try {
      const { name, customDomain } = req.body;
      
      const updates = {};
      if (name) updates.name = name;
      if (customDomain) updates.customDomain = customDomain;
      
      await req.user.update(updates);
      
      res.json({
        success: true,
        data: req.user
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update profile'
      });
    }
  }
  
  // Change password
  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      
      // Verify current password
      const isPasswordValid = await req.user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect'
        });
      }
      
      // Update password
      req.user.password = newPassword;
      await req.user.save();
      
      res.json({
        success: true,
        message: 'Password updated successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to change password'
      });
    }
  }
  
  // Regenerate API key
  static async regenerateApiKey(req, res) {
    try {
      const newApiKey = crypto.randomBytes(32).toString('hex');
      await req.user.update({ apiKey: newApiKey });
      
      res.json({
        success: true,
        apiKey: newApiKey
      });
    } catch (error) {
      console.error('Regenerate API key error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to regenerate API key'
      });
    }
  }
}

module.exports = AuthController;
