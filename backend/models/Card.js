const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Card = sequelize.define('Card', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tenantId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'tenants',
      key: 'tenantId'
    }
  },
  tagId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    get() {
      return this.getDataValue('tagId').toUpperCase();
    },
    set(value) {
      this.setDataValue('tagId', value.toUpperCase());
    }
  },
  businessUrl: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  tapCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastTapped: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Polymorphic metadata stored as JSON
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    get() {
      const rawValue = this.getDataValue('metadata');
      return rawValue || {};
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'cards',
  timestamps: true,
  indexes: [
    {
      fields: ['tenantId']
    },
    {
      fields: ['tagId']
    },
    {
      fields: ['tenantId', 'tagId']
    }
  ]
});

// Instance method to increment tap count
Card.prototype.recordTap = async function() {
  this.tapCount += 1;
  this.lastTapped = new Date();
  return await this.save();
};

module.exports = Card;
