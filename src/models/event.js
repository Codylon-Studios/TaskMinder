const { DataTypes } = require('sequelize');
const sequelize = require('../sequelize');

const EventType = require('./eventType');

const Event = sequelize.define('Event', {
    eventId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    type: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: EventType,
        key: 'type',
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
