import { Session, SessionData } from "express-session";
import { RequestError } from "../@types/requestError";
import { default as prisma } from "../config/prisma";
import logger from "../config/logger";
import { CACHE_KEY_PREFIXES, generateCacheKey, redisClient } from "../config/redis";
import { BigIntreplacer, invalidateCache, updateCacheData, generateRandomBase62String } from "../utils/validate.functions";
import {
  addPrivateTeamTypeBody,
  deletePrivateTeamTypeBody,
  joinPrivateTeamTypeBody,
  leavePrivateTeamTypeBody,
  setJoinedTeamsTypeBody,
  setTeamsTypeBody
} from "../schemas/team.schema";
import fs from "fs/promises";
import path from "path";
import { FINAL_UPLOADS_DIR } from "../config/upload";
import socketIO, { SOCKET_EVENTS } from "../config/socket";
import { encryptionManager } from "../utils/encryption.manager";

const checkLoggedIn = (session: Session & Partial<SessionData>): boolean => {
  const accountId = session.account?.accountId;
  return accountId ? true : false;
};

const teamService = {
  // gets all teams data: private and public teams in class - all users
  async getTeamsData(session: Session & Partial<SessionData>) {
    const classId = Number(session.classId);
    const cacheKey = generateCacheKey(CACHE_KEY_PREFIXES.TEAMS, classId.toString());

    const isLoggedIn = checkLoggedIn(session);
    const accountId = session.account?.accountId;

    const filterTeams = async (
      teams: {
        teamId: number;
        name: string;
        isPrivate: boolean;
        inviteCode: string | null;
      }[]
      // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    ) => {
      // if not logged in, return all non-private data
      if (!isLoggedIn) {
        return teams.filter(t => !t.isPrivate);
      }

      const joinedTeams = await prisma.joinedTeams.findMany({
        where: { accountId },
        select: { teamId: true }
      });
      // filter with joinedTeams
      const joinedIds = new Set(joinedTeams.map(t => t.teamId));
      return teams.filter(t => !t.isPrivate || joinedIds.has(t.teamId));
    };

    // Business logic START
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      try {
        const teams = JSON.parse(cached);
        return await filterTeams(teams);
      }
      catch (err) {
        logger.error(`Error parsing Redis data: ${err}`);
        // fall through to prevent crashes and rely on DB
      }
    }

    // teams data was not found in cache, try DB
    const teams = await prisma.team.findMany({
      where: { classId },
      select: {
        teamId: true,
        name: true,
        isPrivate: true,
        inviteCode: true
      }
    });

    const processedTeams = teams.map(team => ({
      ...team,
      inviteCode:
        team.isPrivate && team.inviteCode
          ? encryptionManager.decrypt(team.inviteCode)
          : null
    }));

    // update cache (best effort)
    try {
      await updateCacheData(processedTeams, cacheKey);
    }
    catch (err) {
      logger.error(`Error updating Redis data: ${err}`);
      // fall through to prevent crashes and rely on DB
    }

    const filtered = await filterTeams(processedTeams);
    // Avoid BigInt serialization issues
    return JSON.parse(JSON.stringify(filtered, BigIntreplacer));
  },
  // sets public teams data in class (manager only)
  async setTeamsData(reqData: setTeamsTypeBody, session: Session & Partial<SessionData>) {
    const { teams } = reqData;
    const classId = parseInt(session.classId!, 10);
    // check for any private teams and reject the request if present
    const teamIds = teams
      .map(t => t.teamId)
      .filter((id): id is number => id !== "" && typeof id === "number");

    if (teamIds.length > 0) {
      const privateTeams = await prisma.team.findMany({
        where: {
          classId,
          teamId: { in: teamIds },
          isPrivate: true
        },
        select: { teamId: true }
      });

      if (privateTeams.length > 0) {
        const err: RequestError = {
          name: "Bad Request",
          status: 400,
          message: "Private teams cannot be modified through this route",
          expected: true
        };
        throw err;
      }
    }
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
        classId: parseInt(session.classId!),
        isPrivate: false
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
                await fs.unlink(filePath).catch(() => {
                  logger.error(`File could not be deleted during team deletion, teamId: ${team.teamId}`);
                });
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
            // Delete all upload requests of this team
            await tx.uploadRequest.deleteMany({
              where: {
                teamId: team.teamId
              }
            });
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
        try {
          // create team if no teamId available
          if (team.teamId === "") {
            dataChanged = true;
            await tx.team.create({
              data: {
                classId: classId,
                name: team.name,
                isPrivate: false,
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
      // invalidate team cache
      await invalidateCache("TEAMS", session.classId!);
      const io = socketIO.getIO();
      io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.TEAMS);

      // If teams were deleted, also update homework, events, and lessons caches
      if (teamsDeleted) {
        await invalidateCache("HOMEWORK", session.classId!);
        await invalidateCache("EVENT", session.classId!);
        await invalidateCache("LESSON", session.classId!);

        io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.HOMEWORK);
        io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.EVENTS);
        io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.TIMETABLES);
      }
    }
  },
  // gets all joined teams id: private and public (logged in users only)
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
  // add/create a private team (and join it) (logged in users only)
  async addPrivateTeam(reqData: addPrivateTeamTypeBody, session: Session & Partial<SessionData>) {
    const { name } = reqData;
    const classId = parseInt(session.classId!, 10);
    const accountId = session.account!.accountId;

    const inviteCode = generateRandomBase62String();
    const encryptedInviteCode = encryptionManager.encrypt(inviteCode);
    const inviteCodeHash = encryptionManager.hash(inviteCode);

    try {
      const createdTeam = await prisma.$transaction(async tx => {
        const newTeam = await tx.team.create({
          data: {
            classId,
            name,
            isPrivate: true,
            inviteCode: encryptedInviteCode,
            inviteCodeHash,
            createdAt: Date.now()
          }
        });

        await tx.joinedTeams.create({
          data: {
            teamId: newTeam.teamId,
            accountId,
            createdAt: Date.now()
          }
        });

        return newTeam;
      });

      await invalidateCache("TEAMS", session.classId!);
      const io = socketIO.getIO();
      io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.TEAMS);
      io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.JOINED_TEAMS);

      return {
        teamId: createdTeam.teamId,
        teamName: createdTeam.name,
        inviteCode
      };
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
  },
  // join private team based on invite code (logged in users only)
  async joinPrivateTeam(reqData: joinPrivateTeamTypeBody, session: Session & Partial<SessionData>) {
    const { inviteCode } = reqData;
    const classId = parseInt(session.classId!, 10);
    const accountId = session.account!.accountId;

    // reject already encrypted values for safety
    if (encryptionManager.isEncrypted(inviteCode)) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Invalid invite code",
        expected: true
      };
      throw err;
    }

    // find class through inviteCodeHash
    const inviteCodeHash = encryptionManager.hash(inviteCode);
    const targetTeam = await prisma.team.findFirst({
      where: {
        classId,
        inviteCodeHash
      }
    });

    if (!targetTeam || !targetTeam.isPrivate) {
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "Private team not found",
        expected: true
      };
      throw err;
    }
    // create new join entry and send socket event
    await prisma.joinedTeams.create({
      data: {
        teamId: targetTeam.teamId,
        accountId,
        createdAt: Date.now()
      }
    });

    const io = socketIO.getIO();
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.JOINED_TEAMS);
  },
  // set joined teams data only for public teams (logged in users only)
  async setJoinedTeamsData(reqData: setJoinedTeamsTypeBody, session: Session & Partial<SessionData>) {
    const { teams } = reqData;
    const accountId = session.account!.accountId;
    const classId = parseInt(session.classId!, 10);

    const publicTeams = await prisma.team.findMany({
      where: {
        classId,
        teamId: { in: teams },
        isPrivate: false
      },
      select: { teamId: true }
    });
    const publicTeamIds = new Set(publicTeams.map(team => team.teamId));
    const invalidTeams = teams.filter(teamId => !publicTeamIds.has(teamId));
    if (invalidTeams.length > 0) {
      const err: RequestError = {
        name: "Forbidden",
        status: 403,
        message: "One or more teams are not public or not accessible",
        expected: true
      };
      throw err;
    }

    await prisma.$transaction(async tx => {
      await tx.joinedTeams.deleteMany({
        where: {
          accountId,
          Team: {
            classId,
            isPrivate: false
          }
        }
      });

      if (teams.length > 0) {
        try {
          await tx.joinedTeams.createMany({
            data: teams.map(teamId => ({
              teamId,
              accountId,
              createdAt: Date.now()
            })),
            skipDuplicates: true
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

    const io = socketIO.getIO();
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.JOINED_TEAMS);
  },
  // delete a private team (logged in users only)
  async deletePrivateTeam(reqData: deletePrivateTeamTypeBody, session: Session & Partial<SessionData>) {
    const { teamId } = reqData;
    const classId = parseInt(session.classId!, 10);
    const accountId = session.account!.accountId;

    // check for team existence
    const team = await prisma.team.findUnique({
      where: { teamId, classId }
    });
    if (!team || !team.isPrivate) {
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "Private team not found",
        expected: true
      };
      throw err;
    }

    // check for valid membership
    const isMember = await prisma.joinedTeams.findUnique({
      where: {
        teamId_accountId: {
          teamId: team.teamId,
          accountId
        }
      }
    });
    if (!isMember) {
      const err: RequestError = {
        name: "Forbidden",
        status: 403,
        message: "You are not a member of this private team",
        expected: true
      };
      throw err;
    }

    await prisma.$transaction(async tx => {
      //delete all physical files on disk of private team
      const uploads = await tx.upload.findMany({
        where: { teamId },
        include: { Files: true }
      });
      const classDir = path.join(FINAL_UPLOADS_DIR, classId.toString());
      for (const upload of uploads) {
        for (const file of upload.Files) {
          const filePath = path.join(classDir, file.storedFileName);
          await fs.unlink(filePath).catch(() => { });
        }

        const sizeToRelease = upload.status === "completed"
          ? BigInt(upload.Files.reduce((sum, file) => sum + file.size, 0))
          : upload.reservedBytes;
        if (sizeToRelease > 0n) {
          await tx.class.update({
            where: { classId },
            data: { storageUsedBytes: { decrement: sizeToRelease } }
          });
        }
      }
      // delete all upload requests of private team
      await tx.uploadRequest.deleteMany({
        where: {
          teamId: team.teamId
        }
      });
      // delete all file metadata of private team
      await tx.fileMetadata.deleteMany({
        where: {
          uploadId: {
            in: uploads.map(u => u.uploadId)
          }
        }
      });
      // delete all uploads of private team
      await tx.upload.deleteMany({
        where: { teamId }
      });
      // delete all homework of private team
      await tx.homework.deleteMany({
        where: { teamId }
      });
      // delete all events of private team
      await tx.event.deleteMany({
        where: { teamId }
      });
      // delete all lessons of private team
      await tx.lesson.deleteMany({
        where: { teamId }
      });
      // delete all joinedTeams data of private team
      await tx.joinedTeams.deleteMany({
        where: { teamId }
      });
      // delete private team
      await tx.team.delete({
        where: { teamId }
      });
    });

    await invalidateCache("TEAMS", session.classId!);
    await invalidateCache("HOMEWORK", session.classId!);
    await invalidateCache("EVENT", session.classId!);
    await invalidateCache("LESSON", session.classId!);
    await invalidateCache("UPLOADMETADATA", session.classId!);
    await invalidateCache("UPLOADREQUESTS", session.classId!);

    const io = socketIO.getIO();
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.TEAMS);
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.JOINED_TEAMS);
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.HOMEWORK);
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.EVENTS);
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.TIMETABLES);
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.UPLOADS);
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.UPLOAD_REQUESTS);
  },
  // leave private team (logged in users only)
  async leavePrivateTeam(reqData: leavePrivateTeamTypeBody, session: Session & Partial<SessionData>) {
    const { teamId } = reqData;
    const classId = parseInt(session.classId!, 10);
    const accountId = session.account!.accountId;

    // check for team existence
    const team = await prisma.team.findUnique({
      where: { teamId, classId }
    });
    if (!team || !team.isPrivate) {
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "Private team not found",
        expected: true
      };
      throw err;
    }

    // check for valid membership
    const isMember = await prisma.joinedTeams.findUnique({
      where: {
        teamId_accountId: {
          teamId: team.teamId,
          accountId
        }
      }
    });
    if (!isMember) {
      const err: RequestError = {
        name: "Forbidden",
        status: 403,
        message: "You are not a member of this private team",
        expected: true
      };
      throw err;
    }

    // check if private team should be deleted instead
    const membersCount = await prisma.joinedTeams.count({
      where: { teamId: team.teamId }
    });
    if (membersCount <= 1) {
      const err: RequestError = {
        name: "Conflict",
        status: 409,
        message: "You are the last member. Please delete the private team instead",
        expected: true
      };
      throw err;
    }
    await prisma.joinedTeams.delete({
      where: {
        teamId_accountId: {
          teamId: team.teamId,
          accountId
        }
      }
    });

    const io = socketIO.getIO();
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.JOINED_TEAMS);
  }
};

export default teamService;
