const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const timetable = sequelize.define('Timetable', {
    timetableId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    school: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    content: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    lastUpdated: {
      type: DataTypes.BIGINT,
      allowNull: false  
    }
  }, {
    tableName: 'timetable',
    timestamps: false,
  });
module.exports = timetable;
