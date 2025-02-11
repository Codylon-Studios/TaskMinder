const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');
const User = require('../models/users');
const Homework10d = require('../models/homework');


const Homework10dCheck = sequelize.define('Homework10dCheck', {
    checkId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING(255),
      allowNull: false,
      references: {
        model: User,
        key: 'username',
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
    checked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  }, {
    tableName: 'homework10dCheck',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['username', 'homeworkId'],
      },
    ],
  });


  module.exports = Homework10dCheck;