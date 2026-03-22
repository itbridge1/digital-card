const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const CardRegister = sequelize.define(
  "CardRegister",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tagId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: "tag_id",
      get() {
        const value = this.getDataValue("tagId");
        return value ? value.toUpperCase() : value;
      },
      set(value) {
        this.setDataValue("tagId", String(value || "").toUpperCase());
      },
    },
    status: {
      type: DataTypes.ENUM("registered", "unregistered", "blocked"),
      allowNull: false,
      defaultValue: "registered",
    },
    url: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    redirectUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: "redirect_url",
    },
    tenantId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "tenant_id",
      references: {
        model: "tenants",
        key: "tenantId",
      },
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "user_id",
      references: {
        model: "users",
        key: "id",
      },
    },
    cardId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "card_id",
      references: {
        model: "cards",
        key: "id",
      },
    },
  },
  {
    tableName: "card_registers",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["tag_id"] },
      { fields: ["tenant_id"] },
      { fields: ["user_id"] },
      { fields: ["status"] },
    ],
  },
);

module.exports = CardRegister;
