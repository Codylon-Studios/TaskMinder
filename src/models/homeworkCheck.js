const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Account = require('./account');
const Homework10d = require('./homework');

const Homework10dCheck = sequelize.define('Homework10dCheck', {
    checkId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    accountId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Account,
        key: 'accountId',
      },
      onDelete: 'CASCADE',
    },
    homeworkId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Homework10d,
        key: 'homeworkId',
      },
      onDelete: 'CASCADE',
    },
  }, {
    tableName: 'homework10dCheck',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['accountId', 'homeworkId'],
      },
    ],
  });


module.exports = Homework10dCheck;
