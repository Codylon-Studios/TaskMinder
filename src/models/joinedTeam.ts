import { Model, DataTypes, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import sequelize from "../config/sequelize";

import Team from "./team";
import Account from "./account";

export default class JoinedTeam extends Model<InferAttributes<JoinedTeam>, InferCreationAttributes<JoinedTeam>> {
  declare joinedTeamId: CreationOptional<number>;
  declare teamId: number;
  declare accountId: number;
}

JoinedTeam.init({
  joinedTeamId: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  teamId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Team,
      key: "teamId",
    },
    onDelete: "CASCADE",
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
  tableName: "joinedTeams",
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ["teamId", "accountId"],
    },
  ],
});
