import { connectRedis, redisClient, cacheKeyHomeworkData, cacheExpiration } from "../config/constant";
import Homework10d from "../models/homeworkModel";
import Homework10dCheck from "../models/homeworkCheck";
import socketIO from "../config/socket";
import { Session, SessionData } from "express-session";
import { RequestError } from "../@types/requestError";
import logger from "../utils/logger";
import * as dotenv from "dotenv";
dotenv.config()

connectRedis();

async function updateCacheHomeworkData(data: Homework10d[]) {
  try {
    await redisClient.set(cacheKeyHomeworkData, JSON.stringify(data), { EX: cacheExpiration });
  } catch (err) {
    logger.error("Error updating Redis cache:", err);
  }
};

const homeworkService = {
  async addHomework(reqData: {subjectId: number, content: string, assignmentDate: number, submissionDate: number,
                    teamId: number}, session: Session & Partial<SessionData>) {
    const { subjectId, content, assignmentDate, submissionDate, teamId } = reqData;
    if (!(session.account)) {
      let err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged in",
        expected: true,
      }
      throw err;
    }
    try {
      await Homework10d.create({
        content: content,
        subjectId: subjectId,
        assignmentDate: assignmentDate,
        submissionDate: submissionDate,
        teamId: teamId
      });
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
    const data = await Homework10d.findAll({ raw: true, order: [["submissionDate", "ASC"]] });
    await updateCacheHomeworkData(data);
    const io = socketIO.getIO();
    io.emit("updateHomeworkData");
  },

  async checkHomework(reqData: {homeworkId: number, checkStatus: string}, session: Session & Partial<SessionData>) {
    const { homeworkId, checkStatus } = reqData;
    let accountId;
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
    if (checkStatus == "true") {
      await Homework10dCheck.findOrCreate({
        where: { accountId, homeworkId },
        defaults: { accountId, homeworkId },
      });
    }
    else {
      await Homework10dCheck.destroy({
        where: {
          accountId: accountId,
          homeworkId: homeworkId,
        }
      });
    }
    const io = socketIO.getIO();
    io.emit("updateHomeworkData");
  },

  async deleteHomework(homeworkId: number, session: Session & Partial<SessionData>) {
    if (!(session.account)) {
      let err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged in",
        expected: true,
      }
      throw err;
    }
    if (!homeworkId) {
      let err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Invalid data format",
        expected: true,
      }
      throw err;
    }
    await Homework10d.destroy({
      where: {
        homeworkId: homeworkId
      }
    });
    const data = await Homework10d.findAll({ raw: true, order: [["submissionDate", "ASC"]] });
    await updateCacheHomeworkData(data);
    const io = socketIO.getIO();
    io.emit("updateHomeworkData");
  },

  async editHomework(reqData: {homeworkId: number, subjectId: number, content: string, assignmentDate: number, submissionDate: number,
                     teamId: number}, session: Session & Partial<SessionData>) {
      const { homeworkId, subjectId, content, assignmentDate, submissionDate, teamId } = reqData;
      if (!(session.account)) {
        let err: RequestError = {
          name: "Unauthorized",
          status: 401,
          message: "User not logged in",
          expected: true,
        }
      throw err;
    }
    try {
      await Homework10d.update(
        {
          content: content,
          subjectId: subjectId,
          assignmentDate: assignmentDate,
          submissionDate: submissionDate,
          teamId: teamId
        },
        {
          where: { homeworkId: homeworkId }
        }
      );
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
    
    const data = await Homework10d.findAll({ raw: true, order: [["submissionDate", "ASC"]] });
    await updateCacheHomeworkData(data);
    const io = socketIO.getIO();
    io.emit("updateHomeworkData");
  },

  async getHomeworkData() {
    const cachedHomeworkData = await redisClient.get(cacheKeyHomeworkData);

    if (cachedHomeworkData) {
      try {
        return JSON.parse(cachedHomeworkData);
      } catch (error) {
        logger.error("Error parsing Redis data:", error);
        throw new Error()
      }
    }

    const data = await Homework10d.findAll({ raw: true, order: [["submissionDate", "ASC"]] });

    await updateCacheHomeworkData(data);

    return data;
  },

  async getHomeworkCheckedData(session: Session & Partial<SessionData>) {
    let accountId;
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
    let homework = await Homework10dCheck.findAll({
      where: { accountId: accountId },
      attributes: [ "homeworkId" ],
      raw: true
    });

    let homeworkIds = homework.map((homework) => {return homework.homeworkId})

    return homeworkIds;
  }
}

export default homeworkService;
