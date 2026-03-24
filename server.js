const app = require('./app');
const { sequelize, testConnection } = require('./config/database');
const { initRedis } = require('./services/cacheService');
const { User } = require('./models');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

// Initialize server
const initServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    // Sync database models
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('✅ Database models synchronized');
    
    // Create admin user if not exists
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@shortlink.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
    
    const adminExists = await User.findOne({ where: { email: adminEmail } });
    if (!adminExists) {
      await User.create({
        email: adminEmail,
        password: adminPassword,
        name: 'System Admin',
        role: 'admin',
        emailVerified: true
      });
      console.log('✅ Admin user created');
    }
    
    // Initialize Redis (optional)
    await initRedis();
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log(`
      🚀 URL Shortener SaaS Server
      📡 Environment: ${process.env.NODE_ENV || 'development'}
      🌐 URL: ${process.env.BASE_URL || `http://localhost:${PORT}`}
      📊 API: ${process.env.BASE_URL || `http://localhost:${PORT}`}/api/v1
      🔐 Admin: ${process.env.BASE_URL || `http://localhost:${PORT}`}/admin
      `);
    });
    
    // Graceful shutdown
    const gracefulShutdown = async () => {
      console.log('🛑 Shutting down gracefully...');
      
      server.close(async () => {
        console.log('HTTP server closed');
        
        try {
          await sequelize.close();
          console.log('Database connection closed');
          
          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    };
    
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    
  } catch (error) {
    console.error('❌ Failed to initialize server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

initServer();
