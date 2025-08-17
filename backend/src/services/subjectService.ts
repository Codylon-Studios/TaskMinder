import { RequestError } from "../@types/requestError";
import logger from "../utils/logger";
import { CACHE_KEY_PREFIXES, generateCacheKey, redisClient } from "../config/redis";
import prisma from "../config/prisma";
import { isValidGender, updateCacheData } from "../utils/validateFunctions";
import { Session, SessionData } from "express-session";
import { setSubjectsTypeBody } from "../schemas/subjectSchema";

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

    await prisma.$transaction(async tx => {
      await Promise.all(
        existingSubjects.map(async subject => {
          if (!subjects.some(s => s.subjectId === subject.subjectId)) {
            // delete lessons which where linked to subject
            await tx.lesson.deleteMany({
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

    const data = await prisma.subjects.findMany({
      where: {
        classId: parseInt(session.classId!)
      }
    });

    const setSubjectDataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.SUBJECT, session.classId!);

    try {
      await updateCacheData(data, setSubjectDataCacheKey);
    }
    catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }
  }
};

export default subjectService;
