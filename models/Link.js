const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { nanoid } = require('nanoid');

const Link = sequelize.define('Link', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 50]
    }
  },
  originalUrl: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      isUrl: true
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true
  },
  clicks: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  domain: {
    type: DataTypes.STRING,
    defaultValue: process.env.BASE_URL
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['slug'],
      unique: true
    },
    {
      fields: ['userId']
    },
    {
      fields: ['isActive', 'expiresAt']
    }
  ],
  hooks: {
    beforeCreate: async (link) => {
      if (!link.slug) {
        link.slug = nanoid(6);
      }
    }
  }
});

// Instance methods
Link.prototype.isExpired = function() {
  return this.expiresAt && new Date() > this.expiresAt;
};

Link.prototype.incrementClicks = async function() {
  this.clicks += 1;
  await this.save();
};

module.exports = Link;
