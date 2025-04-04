const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const subjects = sequelize.define('Subjects', {
    subjectsId: {
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
    tableName: 'subjects',
    timestamps: false,
  });
  
module.exports = subjects;