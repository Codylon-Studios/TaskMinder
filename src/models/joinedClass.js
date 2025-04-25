const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const Account = require("./account");

const JoinedClass = sequelize.define("JoinedClass", {
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
  tableName: "joinedClass",
  timestamps: false,
});
  
module.exports = JoinedClass;
