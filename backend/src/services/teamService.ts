import { Session, SessionData } from "express-session";
import { RequestError } from "../@types/requestError";
import prisma from "../config/prisma";
import logger from "../utils/logger";
import { CACHE_KEY_PREFIXES, generateCacheKey, redisClient } from "../config/redis";
import { updateCacheData } from "../utils/validateFunctions";

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
        classId: parseInt(session.classId!)
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

  async setTeamsData(teams: { teamId: number | ""; name: string }[], session: Session & Partial<SessionData>) {

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
        classId: parseInt(session.classId!)
      }
    });

    await prisma.$transaction(async tx => {
      await Promise.all(
        existingTeams.map(async (team: { teamId: number }) => {
          if (!teams.some(t => t.teamId === team.teamId)) {
            // delete homework which were linked to team
            await tx.homework.deleteMany({
              where: { teamId: team.teamId }
            });
            // delete events which were linked to team
            await tx.event.deleteMany({
              where: { teamId: team.teamId }
            });
            // delete lessons which were linked to team
            await tx.lesson.deleteMany({
              where: { teamId: team.teamId }
            });
            // delete team
            await tx.team.delete({
              where: { teamId: team.teamId }
            });
          }
        })
      );

      for (const team of teams) {
        if (team.name.trim() == "") {
          const err: RequestError = {
            name: "Bad Request",
            status: 400,
            message: "Invalid data (Team name cannot be empty)",
            expected: true
          };
          throw err;
        }
        try {
          if (team.teamId == "") {
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
        classId: parseInt(session.classId!)
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
  
  async setJoinedTeamsData(teams: number[], session: Session & Partial<SessionData>) {

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
