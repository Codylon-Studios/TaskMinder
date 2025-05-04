import { Model, DataTypes, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import sequelize from "../config/sequelize";

import Account from "./account";

export default class JoinedClass extends Model<InferAttributes<JoinedClass>, InferCreationAttributes<JoinedClass>> {
  declare joinedClassId: CreationOptional<number>;
  declare accountId: number;
}

JoinedClass.init({
  joinedClassId: {
    type: DataTypes.INTEGER,
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
}, {
  sequelize,
  tableName: "joinedClass",
  timestamps: false,
});
