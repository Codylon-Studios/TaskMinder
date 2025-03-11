const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const Account = sequelize.define('Account', {
  accountId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  },
  username: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  class: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName: 'account',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['accountId'],
    },
  ],
});

module.exports = Account;
