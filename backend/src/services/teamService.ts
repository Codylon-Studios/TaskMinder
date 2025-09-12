import { Session, SessionData } from "express-session";
import { RequestError } from "../@types/requestError";
import { default as prisma } from "../config/prisma";
import logger from "../utils/logger";
import { CACHE_KEY_PREFIXES, generateCacheKey, redisClient } from "../config/redis";
import { updateCacheData } from "../utils/validateFunctions";
import { setJoinedTeamsTypeBody, setTeamsTypeBody } from "../schemas/teamSchema";

const teamService = {
  async getTeamsData(session: Session & Partial<SessionData>) {
    const getTeamsDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.TEAMS, session.classId!);
    const cachedTeamsData = await redisClient.get(getTeamsDataCacheKey);

    if (cachedTeamsData) {
      try {
        return JSON.parse(cachedTeamsData);
      }
      catch (error) {
        logger.error("Error parsing Redis data:", error);
        throw new Error();
      }
    }

    const data = await prisma.team.findMany({
      where: {
        classId: parseInt(session.classId!),
        deletedAt: null
      }
    });

    try {
      await updateCacheData(data, getTeamsDataCacheKey);
    }
    catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }

    return data;
  },

  async setTeamsData(reqData: setTeamsTypeBody, session: Session & Partial<SessionData>) {
    const { teams } = reqData;
    const classId = parseInt(session.classId!);
    if (isNaN(classId)) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Invalid classId in session",
        expected: true
      };
      throw err;
    }

    const existingTeams = await prisma.team.findMany({
      where: {
        classId: parseInt(session.classId!),
        deletedAt: null
      }
    });

    await prisma.$transaction(async tx => {
      await Promise.all(
        existingTeams.map(async (team: { teamId: number }) => {
          if (!teams.some(t => t.teamId === team.teamId)) {
            // soft delete homework which were linked to team
            await tx.homework.updateMany({
              where: { teamId: team.teamId },
              data: { deletedAt: Date.now() }
            });
            // soft delete events which were linked to team
            await tx.event.updateMany({
              where: { teamId: team.teamId },
              data: { deletedAt: Date.now() }
            });
            // soft delete lessons which were linked to team
            await tx.lesson.updateMany({
              where: { teamId: team.teamId },
              data: { deletedAt: Date.now() }
            });
            // soft delete team
            await tx.team.update({
              where: { teamId: team.teamId },
              data: { deletedAt: Date.now() }
            });
          }
        })
      );

      for (const team of teams) {
        if (team.name.trim() === "") {
          const err: RequestError = {
            name: "Bad Request",
            status: 400,
            message: "Invalid data (Team name cannot be empty)",
            expected: true
          };
          throw err;
        }
        try {
          if (team.teamId === "") {
            await tx.team.create({
              data: {
                classId: classId,
                name: team.name
              }
            });
          }
          else {
            await tx.team.update({
              where: { teamId: team.teamId },
              data: {
                classId: classId,
                name: team.name
              }
            });
          }
        }
        catch {
          const err: RequestError = {
            name: "Bad Request",
            status: 400,
            message: "Invalid data format",
            expected: true
          };
          throw err;
        }
      }
    });

    const data = await prisma.team.findMany({
      where: {
        classId: parseInt(session.classId!),
        deletedAt: null
      }
    });

    const setTeamsDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.TEAMS, session.classId!);

    try {
      await updateCacheData(data, setTeamsDataCacheKey);
    }
    catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }
  },

  async getJoinedTeamsData(session: Session & Partial<SessionData>) {

    const accountId = session.account!.accountId;

    const data = await prisma.joinedTeams.findMany({
      where: { accountId: accountId }
    });

    const teams = [];

    for (const entry of data) {
      teams.push(entry.teamId);
    }

    return teams;
  },
  
  async setJoinedTeamsData(reqData: setJoinedTeamsTypeBody, session: Session & Partial<SessionData>) {
    const { teams } = reqData;
    const accountId = session.account!.accountId;

    if (!Array.isArray(teams)) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Invalid data format",
        expected: true
      };
      throw err;
    }

    await prisma.$transaction(async tx => {
      await tx.joinedTeams.deleteMany({
        where: { accountId: accountId }
      });

      for (const teamId of teams) {
        try {
          await tx.joinedTeams.create({
            data: {
              teamId: teamId,
              accountId: accountId
            }
          });
        }
        catch {
          const err: RequestError = {
            name: "Bad Request",
            status: 400,
            message: "Invalid data format",
            expected: true
          };
          throw err;
        }
      }
    });
  }
};

export default teamService;
