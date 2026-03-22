// Model associations
const { sequelize } = require("../config/database");
const User = require("./User");
const Tenant = require("./Tenant");
const Card = require("./Card");
const CardRegister = require("./CardRegister");

// Define associations
Tenant.hasMany(User, {
  foreignKey: "tenantId",
  sourceKey: "tenantId",
});

User.belongsTo(Tenant, {
  foreignKey: "tenantId",
  targetKey: "tenantId",
});

Tenant.hasMany(Card, {
  foreignKey: "tenantId",
  sourceKey: "tenantId",
});

Card.belongsTo(Tenant, {
  foreignKey: "tenantId",
  targetKey: "tenantId",
});

Tenant.hasMany(CardRegister, {
  foreignKey: "tenantId",
  sourceKey: "tenantId",
});

CardRegister.belongsTo(Tenant, {
  foreignKey: "tenantId",
  targetKey: "tenantId",
});

User.hasMany(CardRegister, {
  foreignKey: "userId",
});

CardRegister.belongsTo(User, {
  foreignKey: "userId",
});

Card.hasMany(CardRegister, {
  foreignKey: "cardId",
});

CardRegister.belongsTo(Card, {
  foreignKey: "cardId",
});

module.exports = {
  sequelize,
  User,
  Tenant,
  Card,
  CardRegister,
};
