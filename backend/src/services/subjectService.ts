import { RequestError } from "../@types/requestError";
import logger from "../utils/logger";
import { redisClient, cacheKeySubjectData } from "../config/redis";
import prisma from "../config/prisma";
import { isValidGender, updateCacheData } from "../utils/validateFunctions";

const subjectService = {
  async getSubjectData() {
    const cachedSubjectata = await redisClient.get("subject_data");

    if (cachedSubjectata) {
      try {
        return JSON.parse(cachedSubjectata);
      }
      catch (error) {
        logger.error("Error parsing Redis data:", error);
        throw new Error();
      }
    }

    const data = await prisma.subjects.findMany();

    try {
      await updateCacheData(data, cacheKeySubjectData);
    }
    catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }

    return data;
  },
  async setSubjectData(
    subjects: {
      subjectId: number | "";
      subjectNameLong: string;
      subjectNameShort: string;
      subjectNameSubstitution: string[] | null;
      teacherGender: "d" | "w" | "m";
      teacherNameLong: string;
      teacherNameShort: string;
      teacherNameSubstitution: string[] | null;
    }[]
  ) {
    const existingSubjects = await prisma.subjects.findMany();
    await Promise.all(
      existingSubjects.map(async subject => {
        if (!subjects.some(s => s.subjectId === subject.subjectId)) {
          // delete lessons which where linked to subject
          await prisma.lesson.deleteMany({
            where: { subjectId: subject.subjectId }
          });
          await prisma.subjects.delete({
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
          await prisma.subjects.create({
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
        else {
          await prisma.subjects.update({
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

    const data = await prisma.subjects.findMany();

    try {
      await updateCacheData(data, cacheKeySubjectData);
    }
    catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }
  }
};

export default subjectService;
