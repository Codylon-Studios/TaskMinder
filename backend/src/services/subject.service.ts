import logger from "../config/logger";
import { CACHE_KEY_PREFIXES, generateCacheKey, redisClient } from "../config/redis";
import { default as prisma } from "../config/prisma";
import { BigIntreplacer, invalidateCache, updateCacheData } from "../utils/validate.functions";
import { Session, SessionData } from "express-session";
import { setSubjectsTypeBody } from "../schemas/subject.schema";
import socketIO, { SOCKET_EVENTS } from "../config/socket";
import { RequestError } from "../@types/requestError";

const subjectService = {
  async getSubjectData(session: Session & Partial<SessionData>) {

    const getSubjectDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.SUBJECT, session.classId!);
    const cachedSubjectata = await redisClient.get(getSubjectDataCacheKey);

    if (cachedSubjectata) {
      try {
        return JSON.parse(cachedSubjectata);
      }
      catch (error) {
        logger.error(`Error parsing Redis cache: ${error}`);
        // fall through to prevent crashes and rely on DB
      }
    }

    const data = await prisma.subjects.findMany({
      where: {
        classId: parseInt(session.classId!)
      },
      orderBy: {
        subjectNameLong: "asc"
      }
    });

    try {
      await updateCacheData(data, getSubjectDataCacheKey);
    }
    catch (err) {
      logger.error(`Error updating Redis cache: ${err}`);
      // fall through to prevent crashes and rely on DB
    }

    const stringified = JSON.stringify(data, BigIntreplacer);
    return JSON.parse(stringified);
  },
  async setSubjectData(
    reqData: setSubjectsTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const { subjects } = reqData;
    const classId = parseInt(session.classId!, 10);

    const existingSubjects = await prisma.subjects.findMany({
      where: {
        classId
      }
    });

    // variable to check if cache should be reloaded
    let dataChanged = false;
    // track if subjects were deleted (affects homework and lessons)
    let subjectsDeleted = false;

    await prisma.$transaction(async tx => {
      // delete subjects that are no present in new request
      await Promise.all(
        existingSubjects.map(async subject => {
          if (!subjects.some(s => s.subjectId === subject.subjectId)) {
            dataChanged = true;
            subjectsDeleted = true;
            // delete lessons which where linked to subject
            await tx.lesson.deleteMany({
              where: { subjectId: subject.subjectId }
            });
            // delete homework which where linked to subject
            await tx.homework.deleteMany({
              where: { subjectId: subject.subjectId }
            });
            // delete subjects themselves
            await tx.subjects.delete({
              where: { subjectId: subject.subjectId }
            });
          }
        })
      );

      for (const subject of subjects) {
        // if subject has no Id yet -> new subject
        if (subject.subjectId === "") {
          dataChanged = true;
          await tx.subjects.create({
            data: {
              classId: classId,
              subjectNameLong: subject.subjectNameLong,
              subjectNameShort: subject.subjectNameShort,
              subjectNameSubstitution: subject.subjectNameSubstitution ?? [],
              teacherGender: subject.teacherGender,
              teacherNameLong: subject.teacherNameLong,
              teacherNameShort: subject.teacherNameShort,
              teacherNameSubstitution: subject.teacherNameSubstitution ?? [],
              createdAt: BigInt(BigInt(Date.now()))
            }
          });
        }
        else {
          dataChanged = true;
          const updated = await tx.subjects.updateMany({
            where: {
              subjectId: subject.subjectId,
              classId: classId
            },
            data: {
              subjectNameLong: subject.subjectNameLong,
              subjectNameShort: subject.subjectNameShort,
              subjectNameSubstitution: subject.subjectNameSubstitution ?? [],
              teacherGender: subject.teacherGender,
              teacherNameLong: subject.teacherNameLong,
              teacherNameShort: subject.teacherNameShort,
              teacherNameSubstitution: subject.teacherNameSubstitution ?? []
            }
          });

          if (updated.count === 0) {
            const err: RequestError = {
              name: "Not Found",
              status: 404,
              message: "Subject not found for update",
              expected: true
            };
            throw err;
          }
        }
      }
    });

    if (dataChanged) {
      // invalidate subject cache
      await invalidateCache("SUBJECT", classId.toString());
      const io = socketIO.getIO();
      io.to(`class:${classId}`).emit(SOCKET_EVENTS.SUBJECTS);

      // If subjects were deleted, also delete lessons and homework caches
      if (subjectsDeleted) {
        await invalidateCache("LESSON", classId.toString());
        await invalidateCache("HOMEWORK", classId.toString());

        io.to(`class:${classId}`).emit(SOCKET_EVENTS.TIMETABLES);
        io.to(`class:${classId}`).emit(SOCKET_EVENTS.HOMEWORK);
      }
    }
    logger.info(`Subject data set for class: ${classId}`);
  }
};

export default subjectService;
