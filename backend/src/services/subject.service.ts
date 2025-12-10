import { RequestError } from "../@types/requestError";
import logger from "../config/logger";
import { CACHE_KEY_PREFIXES, generateCacheKey, redisClient } from "../config/redis";
import { default as prisma } from "../config/prisma";
import { invalidateCache, isValidGender, updateCacheData } from "../utils/validate.functions";
import { Session, SessionData } from "express-session";
import { setSubjectsTypeBody } from "../schemas/subject.schema";
import socketIO, { SOCKET_EVENTS } from "../config/socket";

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
        throw new Error();
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
      throw new Error();
    }

    return data;
  },
  async setSubjectData(
    reqData: setSubjectsTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const { subjects } = reqData;
    const existingSubjects = await prisma.subjects.findMany({
      where: {
        classId: parseInt(session.classId!)
      }
    });

    const classId = parseInt(session.classId!);

    // variable to check if cache should be reloaded
    let dataChanged = false;
    // track if subjects were deleted (affects homework and lessons)
    let subjectsDeleted = false;

    // disable complexity because process pretty straightforward
    // eslint-disable-next-line complexity
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
        // check if subjectNames or/and teacherNames are empty
        const subjectNameInvalid = subject.subjectNameLong.trim() === "" || subject.subjectNameShort.trim() === "";
        const teacherNameInvalid = subject.teacherNameLong.trim() === "" || subject.teacherNameShort.trim() === "";
        if (subjectNameInvalid || teacherNameInvalid) {
          const err: RequestError = {
            name: "Bad Request",
            status: 400,
            message: "Invalid data format",
            expected: true
          };
          throw err;
        }
        // check if valid gender was given
        await isValidGender(subject.teacherGender);
        try {
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
                createdAt: Date.now()
              }
            });
          }
          else {
            dataChanged = true;
            await tx.subjects.update({
              where: { subjectId: subject.subjectId },
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
      // invalidate subject cache
      await invalidateCache("SUBJECT", session.classId!);
      const io = socketIO.getIO();
      io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.SUBJECTS);

      // If subjects were deleted, also delete lessons and homework caches
      if (subjectsDeleted) {
        await invalidateCache("LESSON", session.classId!);
        await invalidateCache("HOMEWORK", session.classId!);

        io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.TIMETABLES);
        io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.HOMEWORK);
      }
    }
  }
};

export default subjectService;
