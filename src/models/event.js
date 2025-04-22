const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const EventType = require('./eventType');
const Team = require('./team');

const Event = sequelize.define('Event', {
    eventId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    eventTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: EventType,
        key: 'eventTypeId',
      },
      onDelete: 'CASCADE',
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    startDate: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    lesson: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    tableName: 'event',
    timestamps: false,
    validate: {
      atLeastOneNull() {
        if (!(["", undefined, null].includes(this.endDate) || ["", undefined, null].includes(this.lesson))) {
          throw new Error("");
        }
      }
    }
    
  });
  
module.exports = Event;
