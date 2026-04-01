const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * CardTemplate – stores a per-tenant dynamic field schema.
 *
 * `fields` is a JSON array of field-definition objects:
 *   [{ key, label, type, required, order }, ...]
 *
 * Supported types: text | email | phone | url | textarea | number | date | select
 * For "select" fields supply `options: ["Opt A", "Opt B"]`
 */
const CardTemplate = sequelize.define('CardTemplate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  tenantId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'tenant_id',
    references: { model: 'tenants', key: 'tenantId' },
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  /** Ordered list of field definitions */
  fields: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    get() {
      const raw = this.getDataValue('fields');
      if (!raw) return [];
      if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch { return []; }
      }
      return raw;
    },
  },
  /** Whether this is the default template used for the tenant's card form */
  isDefault: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_default',
  },
}, {
  tableName: 'card_templates',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['tenant_id', 'is_default'] },
  ],
});

module.exports = CardTemplate;
