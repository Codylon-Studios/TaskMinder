const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const EventType = sequelize.define("EventType", {
  eventTypeId: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  color: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate : {
      is: /^#[0-9a-f]{6}$/i
    }
  },
}, {
  tableName: "eventType",
  timestamps: false,
});
  
module.exports = EventType;
