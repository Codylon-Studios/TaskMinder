import { RequestError } from "../@types/requestError";
import logger from "../utils/logger";
import { CACHE_KEY_PREFIXES, generateCacheKey, redisClient } from "../config/redis";
import { default as prisma } from "../config/prisma";
import { isValidGender, updateCacheData } from "../utils/validateFunctions";
import { Session, SessionData } from "express-session";
import { setSubjectsTypeBody } from "../schemas/subjectSchema";
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
        logger.error("Error parsing Redis data:", error);
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
      logger.error("Error updating Redis cache:", err);
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
    if (isNaN(classId)) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Invalid classId in session",
        expected: true
      };
      throw err;
    }

    // variable to check if cache should be reloaded
    let dataChanged = false;
    // track if subjects were deleted (affects homework and lessons)
    let subjectsDeleted = false;

    await prisma.$transaction(async tx => {
      await Promise.all(
        existingSubjects.map(async subject => {
          if (!subjects.some(s => s.subjectId === subject.subjectId)) {
            dataChanged = true;
            subjectsDeleted = true;
            // delete lessons which where linked to subject
            await tx.lesson.deleteMany({
              where: { subjectId: subject.subjectId }
            });
            await tx.homework.deleteMany({
              where: { subjectId: subject.subjectId }
            });
            await tx.subjects.delete({
              where: { subjectId: subject.subjectId }
            });
          }
        })
      );

      for (const subject of subjects) {
        function check(): void {
          if (
            subject.subjectNameLong.trim() === "" ||
            subject.subjectNameShort.trim() === "" ||
            subject.teacherNameLong.trim() === "" ||
            subject.teacherNameShort.trim() === ""
          ) {
            const err: RequestError = {
              name: "Bad Request",
              status: 400,
              message: "Invalid data format",
              expected: true
            };
            throw err;
          }
          isValidGender(subject.teacherGender);
        }
        check();
        try {
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
                teacherNameSubstitution: subject.teacherNameSubstitution ?? []
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
      const data = await prisma.subjects.findMany({
        where: {
          classId: parseInt(session.classId!)
        }
      });

      const setSubjectDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.SUBJECT, session.classId!);

      try {
        await updateCacheData(data, setSubjectDataCacheKey);
        const io = socketIO.getIO();
        io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.SUBJECTS);

        // If subjects were deleted, also update lessons and homework caches
        if (subjectsDeleted) {
          const setLessonDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.LESSON, session.classId!);
          const setHomeworkDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.HOMEWORK, session.classId!);

          const lessonData = await prisma.lesson.findMany({
            where: { classId: parseInt(session.classId!) }
          });
          const homeworkData = await prisma.homework.findMany({
            where: { classId: parseInt(session.classId!) }
          });

          await updateCacheData(lessonData, setLessonDataCacheKey);
          await updateCacheData(homeworkData, setHomeworkDataCacheKey);

          io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.TIMETABLES);
          io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.HOMEWORK);
        }
      }
      catch (err) {
        logger.error("Error updating Redis cache:", err);
        throw new Error();
      }
    }
  }
};

export default subjectService;
