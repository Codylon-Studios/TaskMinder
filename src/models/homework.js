const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const Homework10d = sequelize.define('Homework10d', {
    homeworkId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    subjectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    assignmentDate: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    submissionDate: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  }, {
    tableName: 'homework10d',
    timestamps: false,
  });
  
module.exports = Homework10d;
