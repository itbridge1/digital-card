const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Tenant = sequelize.define('Tenant', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tenantId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    get() {
      return this.getDataValue('tenantId').toUpperCase();
    },
    set(value) {
      this.setDataValue('tenantId', value.toUpperCase());
    }
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('SCHOOL', 'HOSPITAL', 'BUSINESS'),
    allowNull: false
  },
  contactEmail: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  logoUrl: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'tenants',
  timestamps: true
});

module.exports = Tenant;
