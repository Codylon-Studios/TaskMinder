const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const Team = require('./team');

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
    teamId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        async isValidTeamId(teamId) {
          if (teamId == -1) return;
    
          const teamExists = await Team.findByPk(teamId);
          if (!teamExists) {
            throw new Error("Invalid teamId (Team does not exist): " + teamId);
          }
        }
      }
    },
  }, {
    tableName: 'homework10d',
    timestamps: false,
  });
  
module.exports = Homework10d;
