import { Session, SessionData } from "express-session";
import { RequestError } from "../@types/requestError";
import prisma from "../config/prisma";
import logger from "../utils/logger";
import { CACHE_KEY_PREFIXES, generateCacheKey, redisClient } from "../config/redis";
import { updateCacheData } from "../utils/validateFunctions";

const teamService = {
  async getTeamsData(session: Session & Partial<SessionData>) {
    if (!session.classId) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged into class",
        expected: true
      };
      throw err;
    }
    const classExists = await prisma.class.findUnique({
      where: {
        classId: parseInt(session.classId)
      }
    });

    if (!classExists){
      delete session.classId;
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "No class mapped to session.classId, deleting classId from session",
        expected: true
      };
      throw err;
    }

    const getTeamsDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.TEAMS, session.classId);
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
        classId: parseInt(session.classId)
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
    if (!session.account) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Not logged in",
        additionalInformation: "The requesting session is not logged in!",
        expected: true
      };
      throw err;
    }
    if (!session.classId) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged into class",
        expected: true
      };
      throw err;
    }
    const classExists = await prisma.class.findUnique({
      where: {
        classId: parseInt(session.classId)
      }
    });

    if (!classExists){
      delete session.classId;
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "No class mapped to session.classId, deleting classId from session",
        expected: true
      };
      throw err;
    }
    const existingTeams = await prisma.team.findMany({
      where: {
        classId: parseInt(session.classId)
      }
    });
    await Promise.all(
      existingTeams.map(async (team: { teamId: number }) => {
        if (!teams.some(t => t.teamId === team.teamId)) {
          // delete homework which were linked to team
          await prisma.homework.deleteMany({
            where: { teamId: team.teamId }
          });
          // delete events which were linked to team
          await prisma.event.deleteMany({
            where: { teamId: team.teamId }
          });
          // delete lessons which were linked to team
          await prisma.lesson.deleteMany({
            where: { teamId: team.teamId }
          });
          // delete team
          await prisma.team.delete({
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
          await prisma.team.create({
            data: {
              classId: parseInt(session.classId),
              name: team.name
            }
          });
        }
        else {
          await prisma.team.update({
            where: { teamId: team.teamId },
            data: {
              classId: parseInt(session.classId),
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

    const data = await prisma.team.findMany({
      where: {
        classId: parseInt(session.classId)
      }
    });

    const setTeamsDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.TEAMS, session.classId);

    try {
      await updateCacheData(data, setTeamsDataCacheKey);
    }
    catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }
  },

  async getJoinedTeamsData(session: Session & Partial<SessionData>) {
    let accountId;
    if (!session.account) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged in",
        expected: true
      };
      throw err;
    }
    if (!session.classId) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged into class",
        expected: true
      };
      throw err;
    }
    else {
      accountId = session.account.accountId;
    }

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
    let accountId;
    if (!session.account) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged in",
        expected: true
      };
      throw err;
    }
    if (!session.classId) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged into class",
        expected: true
      };
      throw err;
    }
    else {
      accountId = session.account.accountId;
    }

    if (!Array.isArray(teams)) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Invalid data format",
        expected: true
      };
      throw err;
    }

    await prisma.joinedTeams.deleteMany({
      where: { accountId: accountId }
    });

    for (const teamId of teams) {
      try {
        await prisma.joinedTeams.create({
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
  }
};

export default teamService;
