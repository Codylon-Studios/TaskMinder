import { Model, DataTypes, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import sequelize from "../config/sequelize";

export default class Subject extends Model<InferAttributes<Subject>, InferCreationAttributes<Subject>> {
  declare subjectId: CreationOptional<number>;
  declare subjectNameLong: string;
  declare subjectNameShort: string;
  declare subjectNameSubstitution: string[] | null;
  declare teacherGender: "d" | "w" | "m";
  declare teacherNameLong: string;
  declare teacherNameShort: string;
  declare teacherNameSubstitution: string[] | null;
}

Subject.init({
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
  sequelize,
  tableName: "subjects",
  timestamps: false,
});
