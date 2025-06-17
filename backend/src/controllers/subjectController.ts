import subjectService from "../services/subjectService";
import asyncHandler from "express-async-handler";
import { z } from "zod";

export const getSubjectData = asyncHandler(async (req, res, next) => {
  try {
    const timetableData = await subjectService.getSubjectData();
    res.status(200).json(timetableData);
  }
  catch (error) {
    next(error);
  }
});
export const setSubjectData = asyncHandler(async (req, res, next) => {
  const setSubjectsSchema = z.object({
    subjects: z.array(
      z.object({
        subjectId: z.union([z.coerce.number(), z.literal("")]),
        subjectNameLong: z.string(),
        subjectNameShort: z.string(),
        subjectNameSubstitution: z.array(z.string()).nullable(),
        teacherGender: z.enum(["d", "w", "m"]),
        teacherNameLong: z.string(),
        teacherNameShort: z.string(),
        teacherNameSubstitution: z.array(z.string()).nullable()
      })
    )
  });
  const parseResult = setSubjectsSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Invalid request format",
      expectedFormat: {
        type: "object",
        properties: {
          subjects: {
            type: "array",
            items: {
              type: "object",
              properties: {
                subjectId: { anyOf: [{ type: "number" }, { const: "" }] },
                subjectNameLong: { type: "string" },
                subjectNameShort: { type: "string" },
                subjectNameSubstitution: {
                  type: ["array", "null"],
                  items: { type: "string" }
                },
                teacherGender: { enum: ["d", "w", "m"] },
                teacherNameLong: { type: "string" },
                teacherNameShort: { type: "string" },
                teacherNameSubstitution: {
                  type: ["array", "null"],
                  items: { type: "string" }
                }
              },
              required: [
                "subjectId",
                "subjectNameLong",
                "subjectNameShort",
                "teacherGender",
                "teacherNameLong",
                "teacherNameShort"
              ]
            }
          }
        },
        required: ["subjects"]
      }
    });
    return;
  }
  try {
    await subjectService.setSubjectData(parseResult.data.subjects);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export default {
  getSubjectData,
  setSubjectData
};
