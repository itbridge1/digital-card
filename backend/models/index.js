// Model associations
const { sequelize } = require('../config/database');
const User = require('./User');
const Tenant = require('./Tenant');
const Card = require('./Card');

// Define associations
Tenant.hasMany(User, {
  foreignKey: 'tenantId',
  sourceKey: 'tenantId'
});

User.belongsTo(Tenant, {
  foreignKey: 'tenantId',
  targetKey: 'tenantId'
});

Tenant.hasMany(Card, {
  foreignKey: 'tenantId',
  sourceKey: 'tenantId'
});

Card.belongsTo(Tenant, {
  foreignKey: 'tenantId',
  targetKey: 'tenantId'
});

module.exports = {
  sequelize,
  User,
  Tenant,
  Card
};
