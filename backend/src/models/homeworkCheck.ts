import { Model, DataTypes, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import sequelize from "../config/sequelize";

import Account from "./accountModel";
import Homework10d from "./homeworkModel";

export default class Homework10dCheck extends Model<InferAttributes<Homework10dCheck>, InferCreationAttributes<Homework10dCheck>> {
  declare checkId: CreationOptional<number>;
  declare accountId: number;
  declare homeworkId: number;
}

Homework10dCheck.init({
  checkId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  },
  accountId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Account,
      key: "accountId",
    },
    onDelete: "CASCADE",
  },
  homeworkId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Homework10d,
      key: "homeworkId",
    },
    onDelete: "CASCADE",
  },
}, {
  sequelize,
  tableName: "homework10dCheck",
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ["accountId", "homeworkId"],
    },
  ],
});
