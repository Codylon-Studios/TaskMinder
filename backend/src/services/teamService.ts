import { Session, SessionData } from "express-session";
import { RequestError } from "../@types/requestError";

import logger from "../utils/logger";
import { redisClient, cacheExpiration } from "../config/constant";

import JoinedTeam from "../models/joinedTeamModel";
import Team from "../models/teamModel";

const teamService = {
  async getTeamsData() {
    const cachedTeamsData = await redisClient.get("teams_data");

    if (cachedTeamsData) {
      try {
        return JSON.parse(cachedTeamsData);
      } catch (error) {
        logger.error("Error parsing Redis data:", error);
        throw new Error();
      }
    }

    const data = await Team.findAll({ raw: true });
    await redisClient.set("teams_data", JSON.stringify(data), { EX: cacheExpiration });

    try {
      await redisClient.set("teams_data", JSON.stringify(data), { EX: cacheExpiration });
    } catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }

    return data;
  },
  async setTeamsData(teams: { teamId: number | "", name: string }[]) {
    let existingTeams = await Team.findAll({ raw: true });
    await Promise.all(existingTeams.map(async (team: {teamId: number}) => {
      if (!teams.some((t) => t.teamId === team.teamId)) {
        await Team.destroy({
          where: { teamId: team.teamId }
        });
      }
    }));

    for (let team of teams) {
      if (team.name.trim() == "") {
        let err: RequestError = {
          name: "Bad Request",
          status: 400,
          message: "Invalid data (Team name cannot be empty)",
          expected: true,
        }
        throw err;
      }
      try {
        if (team.teamId == "") {
          await Team.create({
            name: team.name
          })
        }
        else {
          await Team.update(
            {
              name: team.name
            },
            {
              where: { teamId: team.teamId }
            }
          );
        }
      }
      catch {
        let err: RequestError = {
          name: "Bad Request",
          status: 400,
          message: "Invalid data format",
          expected: true,
        }
        throw err;
      }
    }

    const data = await Team.findAll({ raw: true });
    await redisClient.set("teams_data", JSON.stringify(data), { EX: cacheExpiration });

    try {
      await redisClient.set("teams_data", JSON.stringify(data), { EX: cacheExpiration });
    } catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }
  },
  async getJoinedTeamsData(session: Session & Partial<SessionData>) {
    let accountId
    if (!(session.account)) {
      let err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged in",
        expected: true,
      }
      throw err;
    }
    else {
      accountId = session.account.accountId;
    }

    const data = await JoinedTeam.findAll({
      where: { accountId: accountId }
    });

    let teams = []

    for (let entry of data) {
      teams.push(entry.teamId);
    };

    return teams;
  },
  async setJoinedTeamsData(teams: number[], session: Session & Partial<SessionData>) {
    let accountId
    if (!(session.account)) {
      let err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged in",
        expected: true,
      }
      throw err;
    } else {
      accountId = session.account.accountId;
    }

    if (! Array.isArray(teams)) {
      let err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Invalid data format",
        expected: true,
      }
      throw err;
    }

    await JoinedTeam.destroy({
      where: { accountId: accountId }
    });

    for (let teamId of teams) {
      try {
        await JoinedTeam.create({
          teamId: teamId,
          accountId: accountId
        })
      }
      catch {
        let err: RequestError = {
          name: "Bad Request",
          status: 400,
          message: "Invalid data format",
          expected: true,
        }
        throw err;
      }
    }
  },
}

export default teamService;
