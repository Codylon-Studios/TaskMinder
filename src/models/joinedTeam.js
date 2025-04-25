const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const Team = require("./team");
const Account = require("./account");

const JoinedTeams = sequelize.define("JoinedTeams", {
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
  tableName: "joinedTeams",
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ["teamId", "accountId"],
    },
  ],
});
  
module.exports = JoinedTeams;
