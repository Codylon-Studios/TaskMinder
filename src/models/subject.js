const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const subjects = sequelize.define("Subjects", {
  subjectId: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  subjectNameLong: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  subjectNameShort: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  subjectNameSubstitution: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true
  },
  teacherGender: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      isIn: [["d", "w", "m"]]
    }
  },
  teacherNameLong: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  teacherNameShort: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  teacherNameSubstitution: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true
  },
}, {
  tableName: "subjects",
  timestamps: false,
});

module.exports = subjects;
