const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

// Determine which database to use based on environment
const isProduction = process.env.NODE_ENV === 'production';

let sequelize;

if (isProduction) {
  // PostgreSQL for production
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: 'postgres',
      logging: false,
      pool: {
        max: 20,
        min: 5,
        acquire: 30000,
        idle: 10000
      }
    }
  );
} else {
  // SQLite for development
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../database.sqlite'),
    logging: false
  });
}

// Test connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅ Database connected (${isProduction ? 'PostgreSQL' : 'SQLite'})`);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, testConnection };
