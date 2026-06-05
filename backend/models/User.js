const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  tenantId: {
    type: DataTypes.STRING(50),
    allowNull: true,
    references: {
      model: 'tenants',
      key: 'tenantId'
    }
  },
  role: {
    type: DataTypes.ENUM('admin', 'manager', 'tenant', 'viewer'),
    defaultValue: 'viewer'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  mustChangePassword: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Forces user to set a new password on next login'
  },
  uiSettings: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
    field: 'ui_settings',
    comment: 'Per-user UI preferences (e.g. hidden table columns per org)',
    get() {
      const raw = this.getDataValue('uiSettings');
      if (!raw) return {};
      if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch { return {}; }
      }
      // Guard against corrupted char-index objects ({"0":"{","1":"\"",...})
      // These have only numeric string keys and no expected preference keys
      if (typeof raw === 'object' && !Array.isArray(raw)) {
        const keys = Object.keys(raw);
        if (keys.length > 0 && keys.every(k => /^\d+$/.test(k))) return {};
      }
      return raw;
    },
    set(value) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        this.setDataValue('uiSettings', null);
        return;
      }
      // Reject corrupted char-index objects
      const keys = Object.keys(value);
      if (keys.length > 0 && keys.every(k => /^\d+$/.test(k))) {
        this.setDataValue('uiSettings', null);
        return;
      }
      this.setDataValue('uiSettings', value);
    }
  }
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Instance method to check password
User.prototype.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Don't return password in JSON
User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  return values;
};

module.exports = User;
