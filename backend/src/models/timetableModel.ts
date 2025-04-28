import { Model, DataTypes, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import sequelize from "../config/sequelize";

export default class Timetable extends Model<InferAttributes<Timetable>, InferCreationAttributes<Timetable>> {
  declare timetableId: CreationOptional<number>;
  declare class: number;
  declare content: Record<string, any>;
  declare lastUpdated: number;
}

Timetable.init({
  timetableId: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  class: {
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
  sequelize,
  tableName: "timetable",
  timestamps: false,
});
