import { Session, SessionData } from "express-session";
import { RequestError } from "../@types/requestError";
import { default as prisma } from "../config/prisma";
import logger from "../config/logger";
import { CACHE_KEY_PREFIXES, generateCacheKey, redisClient } from "../config/redis";
import { updateCacheData } from "../utils/validate.functions";
import { setJoinedTeamsTypeBody, setTeamsTypeBody } from "../schemas/team.schema";
import fs from "fs/promises";
import path from "path";
import { FINAL_UPLOADS_DIR } from "../config/upload";
import socketIO, { SOCKET_EVENTS } from "../config/socket";

const teamService = {
  async getTeamsData(session: Session & Partial<SessionData>) {
    const getTeamsDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.TEAMS, session.classId!);
    const cachedTeamsData = await redisClient.get(getTeamsDataCacheKey);

    if (cachedTeamsData) {
      try {
        return JSON.parse(cachedTeamsData);
      }
      catch (error) {
        logger.error(`Error parsing Redis data: ${error}`);
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
      logger.error(`Error updating Redis data: ${err}`);
      throw new Error();
    }

    return data;
  },

  async setTeamsData(reqData: setTeamsTypeBody, session: Session & Partial<SessionData>) {
    const { teams } = reqData;

    const classId = parseInt(session.classId!, 10);
    // variable to check if cache should be reloaded (e.g. on team deletion)
    let dataChanged = false;
    // track if teams were deleted (affects homework, events, lessons)
    let teamsDeleted = false;

    // Check for duplicate team names
    const teamNames = teams.map(t => t.name.trim().toLowerCase());
    const uniqueNames = new Set(teamNames);
    if (teamNames.length !== uniqueNames.size) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Duplicate team names are not allowed",
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
            dataChanged = true;
            teamsDeleted = true;
            // Get all uploads for this team to delete files
            const uploads = await tx.upload.findMany({
              where: { teamId: team.teamId },
              include: { Files: true }
            });
            // Delete physical files from disk
            const classDir = path.join(FINAL_UPLOADS_DIR, classId.toString());
            for (const upload of uploads) {
              for (const file of upload.Files) {
                const filePath = path.join(classDir, file.storedFileName);
                await fs.unlink(filePath).catch(() => { });
              }
              // Calculate storage to release
              const sizeToRelease = upload.status === "completed"
                ? BigInt(upload.Files.reduce((sum, file) => sum + file.size, 0))
                : upload.reservedBytes;
              // Update class storage usage
              if (sizeToRelease > 0n) {
                await tx.class.update({
                  where: { classId },
                  data: { storageUsedBytes: { decrement: sizeToRelease } }
                });
              }
            }
            // Delete file metadata records
            await tx.fileMetadata.deleteMany({
              where: {
                uploadId: {
                  in: uploads.map(u => u.uploadId)
                }
              }
            });
            // Delete upload records
            await tx.upload.deleteMany({
              where: { teamId: team.teamId }
            });

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
            // delete joined teams (team memberships) - already done with cascade, but here explicitly again
            await tx.joinedTeams.deleteMany({
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
            dataChanged = true;
            await tx.team.create({
              data: {
                classId: classId,
                name: team.name,
                createdAt: Date.now()
              }
            });
          }
          else {
            // Check if name actually changed
            const existingTeam = existingTeams.find(t => t.teamId === team.teamId);
            if (!existingTeam || existingTeam.name !== team.name) {
              dataChanged = true;
            }
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

    if (dataChanged) {
      const setTeamsDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.TEAMS, session.classId!);

      // Fetch team data
      const teamData = await prisma.team.findMany({
        where: { classId: parseInt(session.classId!) }
      });

      try {
        await updateCacheData(teamData, setTeamsDataCacheKey);
        const io = socketIO.getIO();
        io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.TEAMS);

        // If teams were deleted, also update homework, events, and lessons caches
        if (teamsDeleted) {
          const setHomeworkDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.HOMEWORK, session.classId!);
          const setEventDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.EVENT, session.classId!);
          const setLessonDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.LESSON, session.classId!);

          const homeworkData = await prisma.homework.findMany({
            where: { classId: parseInt(session.classId!) }
          });
          const eventData = await prisma.event.findMany({
            where: { classId: parseInt(session.classId!) }
          });
          const lessonData = await prisma.lesson.findMany({
            where: { classId: parseInt(session.classId!) }
          });

          await updateCacheData(homeworkData, setHomeworkDataCacheKey);
          await updateCacheData(eventData, setEventDataCacheKey);
          await updateCacheData(lessonData, setLessonDataCacheKey);

          io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.HOMEWORK);
          io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.EVENTS);
          io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.TIMETABLES);
        }
      }
      catch (err) {
        logger.error(`Error updating Redis data: ${err}`);
        throw new Error();
      }
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

    await prisma.$transaction(async tx => {
      await tx.joinedTeams.deleteMany({
        where: { accountId: accountId }
      });

      for (const teamId of teams) {
        try {
          await tx.joinedTeams.create({
            data: {
              teamId: teamId,
              accountId: accountId,
              createdAt: Date.now()
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
