import { Model, DataTypes, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import sequelize from "../config/sequelize";

export default class Team extends Model<InferAttributes<Team>, InferCreationAttributes<Team>> {
  declare teamId: CreationOptional<number>;
  declare name: string;
}

Team.init({
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
  sequelize,
  tableName: "team",
  timestamps: false,
});
