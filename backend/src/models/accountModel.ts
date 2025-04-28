import { Model, DataTypes, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import sequelize from "../config/sequelize";

export default class Account extends Model<InferAttributes<Account>, InferCreationAttributes<Account>> {
  declare accountId: CreationOptional<number>;
  declare username: string;
  declare password: string;
  declare isAdmin: boolean | null;
}

Account.init({
  accountId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    autoIncrement: true,
    primaryKey: true,
  },
  username: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    allowNull: true
  }
}, {
  sequelize,
  tableName: "account",
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ["accountId"],
    },
  ],
});
