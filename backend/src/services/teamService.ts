import { Session, SessionData } from "express-session";
import { RequestError } from "../@types/requestError";
import prisma from "../config/prisma";
import logger from "../utils/logger";
import { redisClient, cacheKeyTeamData } from "../config/redis";
import { updateCacheData } from "../utils/validateFunctions";

const teamService = {
  async getTeamsData() {
    const cachedTeamsData = await redisClient.get("teams_data");

    if (cachedTeamsData) {
      try {
        return JSON.parse(cachedTeamsData);
      }
      catch (error) {
        logger.error("Error parsing Redis data:", error);
        throw new Error();
      }
    }

    const data = await prisma.team.findMany();

    try {
      await updateCacheData(data, cacheKeyTeamData);
    }
    catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }

    return data;
  },
  async setTeamsData(teams: { teamId: number | ""; name: string }[]) {
    const existingTeams = await prisma.team.findMany();
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
              name: team.name
            }
          });
        }
        else {
          await prisma.team.update({
            where: { teamId: team.teamId },
            data: {
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

    const data = await prisma.team.findMany();

    try {
      await updateCacheData(data, cacheKeyTeamData);
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
