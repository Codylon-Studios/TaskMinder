const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const Teams = require('./team');
const Accounts = require('./account');

const JoinedTeams = sequelize.define('JoinedTeams', {
    joinedTeamId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    teamId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Teams,
        key: 'teamId',
      },
      onDelete: 'CASCADE',
    },
    accountId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Accounts,
        key: 'accountId',
      },
      onDelete: 'CASCADE',
    },
  }, {
    tableName: 'joinedTeams',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['teamId', "accountId"],
      },
    ],
  });
  
module.exports = JoinedTeams;
