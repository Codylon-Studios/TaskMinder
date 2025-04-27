import { Model, DataTypes, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import sequelize from "../config/sequelize";

export default class EventType extends Model<InferAttributes<EventType>, InferCreationAttributes<EventType>> {
  declare eventTypeId: CreationOptional<number>;
  declare name: string;
  declare color: string;
}

EventType.init({
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
  sequelize,
  tableName: "eventType",
  timestamps: false,
});
