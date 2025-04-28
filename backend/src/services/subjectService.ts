import { RequestError } from "../@types/requestError";

import logger from "../utils/logger";
import { redisClient, cacheExpiration } from "../config/constant";

import Subject from "../models/subjectModel";

const subjectService = {
  async getSubjectData() {
    const cachedSubjectata = await redisClient.get("subject_data");

    if (cachedSubjectata) {
      try {
        return JSON.parse(cachedSubjectata);
      } catch (error) {
        logger.error("Error parsing Redis data:", error);
        throw new Error();
      }
    }

    const data = await Subject.findAll({ raw: true });

    try {
      await redisClient.set("subject_data", JSON.stringify(data), { EX: cacheExpiration });
    } catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }

    return data;
  }, 
  async setSubjectData(subjects: {subjectId: number | "", subjectNameLong: string, subjectNameShort: string, subjectNameSubstitution: string[] | null,
                                  teacherGender: "d" | "w" | "m", teacherNameLong: string, teacherNameShort: string, teacherNameSubstitution: string[] | null}[]) {
    let existingSubjects = await Subject.findAll({ raw: true });
    await Promise.all(existingSubjects.map(async (subject) => {
      if (!subjects.some((s) => s.subjectId === subject.subjectId)) {
        await Subject.destroy({
          where: { subjectId: subject.subjectId }
        });
      }
    }));

    for (let subject of subjects) {
        if (subject.subjectNameLong.trim() == "" || subject.subjectNameShort.trim() == "" ||
            subject.teacherNameLong.trim() == "" || subject.teacherNameShort.trim() == "") {
          let err: RequestError = {
            name: "Bad Request",
            status: 400,
            message: "Invalid data format",
            expected: true,
          }
          throw err;
        }
        try {
          if (subject.subjectId == "") {
            await Subject.create({
              subjectNameLong: subject.subjectNameLong,
              subjectNameShort: subject.subjectNameShort,
              subjectNameSubstitution: subject.subjectNameSubstitution,
              teacherGender: subject.teacherGender,
              teacherNameLong: subject.teacherNameLong,
              teacherNameShort: subject.teacherNameShort,
              teacherNameSubstitution: subject.teacherNameSubstitution,
            })
          }
          else {
            await Subject.update(
              {
                subjectNameLong: subject.subjectNameLong,
                subjectNameShort: subject.subjectNameShort,
                subjectNameSubstitution: subject.subjectNameSubstitution,
                teacherGender: subject.teacherGender,
                teacherNameLong: subject.teacherNameLong,
                teacherNameShort: subject.teacherNameShort,
                teacherNameSubstitution: subject.teacherNameSubstitution,
              },
              {
                where: { subjectId: subject.subjectId }
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

    const data = await Subject.findAll({ raw: true });
    await redisClient.set("subject_data", JSON.stringify(data), { EX: cacheExpiration });

    try {
      await redisClient.set("subject_data", JSON.stringify(data), { EX: cacheExpiration });
    } catch (err) {
      logger.error("Error updating Redis cache:", err);
      throw new Error();
    }
  },
}

export default subjectService;
