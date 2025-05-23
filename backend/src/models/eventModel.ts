import { Model, DataTypes, InferAttributes, InferCreationAttributes, CreationOptional } from "sequelize";
import sequelize from "../config/sequelize";
import pg from 'pg';

pg.types.setTypeParser(20, val => parseInt(val, 10)); // Output bigints as numbers not as strings

import EventType from "./eventTypeModel";
import Team from "./teamModel";

export default class Event extends Model<InferAttributes<Event>, InferCreationAttributes<Event>> {
  declare eventId: CreationOptional<number>;
  declare eventTypeId: number;
  declare name: string;
  declare description: string | null;
  declare startDate: number;
  declare endDate: number | null;
  declare lesson: string | null;
  declare teamId: number;
}

Event.init({
  eventId: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  eventTypeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: EventType,
      key: "eventTypeId",
    },
    onDelete: "CASCADE",
  },
  name: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  startDate: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  endDate: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  lesson: {
    type: DataTypes.TEXT,
    allowNull: true,
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
  tableName: "event",
  timestamps: false,
  validate: {
    atLeastOneNull() {
      if (!(["", undefined, null].includes(this.endDate as string | null | undefined) ||
            ["", undefined, null].includes(this.lesson as string | null | undefined))) {
        throw new Error("");
      }
    }
  }
});

Team.addHook("afterBulkDestroy", async (options) => {
  try {
    await Event.destroy({
      where: { teamId: (options.where as Record<string, any>).teamId },
      transaction: options.transaction
    });
  }
  catch {
    throw new Error("Couldn't read teamId on where attribute on bulk destroy options")
  }
});
