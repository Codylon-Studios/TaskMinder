import { Model, DataTypes, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import sequelize from "../config/sequelize";

import Subject from "./subjectModel";
import Team from "./teamModel";

export default class Lesson extends Model<InferAttributes<Lesson>, InferCreationAttributes<Lesson>> {
  declare lessonId: CreationOptional<number>;
  declare lessonNumber: number;
  declare weekDay: 0 | 1 | 2 | 3 | 4;
  declare teamId?: number;
  declare subjectId: number;
  declare room: string;
  declare startTime: number;
  declare endTime: number;
}

Lesson.init({
  lessonId: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  lessonNumber: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  weekDay: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      async isValidweekDay(weekDay: number) {
        if ([0, 1, 2, 3, 4].includes(weekDay)) return;
        throw new Error("Invalid weekday: " + weekDay);
      }
    }
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
  subjectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      async isValidSubjectId(subjectId: number) {
        if (subjectId == -1) return;
  
        const subjectExists = await Subject.findByPk(subjectId);
        if (!subjectExists) {
          throw new Error("Invalid subjectId (Subject does not exist): " + subjectId);
        }
      }
    }
  },
  room: {
    type: DataTypes.TEXT,
    allowNull: false  
  },
  startTime: {
    type: DataTypes.BIGINT,
    allowNull: false  
  },
  endTime: {
    type: DataTypes.BIGINT,
    allowNull: false  
  }
}, {
  sequelize,
  tableName: "lesson",
  timestamps: false,
});

Team.addHook("afterBulkDestroy", async (options) => {
  try {
    await Lesson.destroy({
      where: { teamId: (options.where as Record<string, any>).teamId },
      transaction: options.transaction
    });
  }
  catch {
    throw new Error("Couldn't read teamId on where attribute on bulk destroy options")
  }
});

Subject.addHook("afterBulkDestroy", async (options) => {
  try {
    await Lesson.destroy({
      where: { subjectId: (options.where as Record<string, any>).subjectId },
      transaction: options.transaction
    });
  }
  catch {
    throw new Error("Couldn't read subjectId on where attribute on bulk destroy options")
  }
});
