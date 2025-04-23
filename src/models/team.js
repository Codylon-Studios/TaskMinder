const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Teams = sequelize.define('Team', {
    teamId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
    }
  }, {
    tableName: 'team',
    timestamps: false,
  });
  
module.exports = Teams;
