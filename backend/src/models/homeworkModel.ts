import { Model, DataTypes, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import sequelize from "../config/sequelize";

import Subject from "./subjectModel";
import Team from "./teamModel";

export default class Homework10d extends Model<InferAttributes<Homework10d>, InferCreationAttributes<Homework10d>> {
  declare homeworkId: CreationOptional<number>;
  declare content: string;
  declare subjectId: number;
  declare assignmentDate: number;
  declare submissionDate: number;
  declare teamId: number;
}

Homework10d.init({
  homeworkId: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  subjectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Subject,
      key: "subjectId",
    },
    onDelete: "CASCADE",
  },
  assignmentDate: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  submissionDate: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  teamId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      async isValidTeamId(teamId: number) {
        if (teamId == -1) return;
  
        const teamExists = await Team.findByPk(teamId);
        if (!teamExists) {
          throw new Error("Invalid teamId (Team does not exist): " + teamId);
        }
      }
    }
  },
}, {
  sequelize,
  tableName: "homework10d",
  timestamps: false,
});
