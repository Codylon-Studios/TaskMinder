import { z } from "zod";
import lessonService from "../services/lessonService";
import asyncHandler from "express-async-handler";

export const getLessonData = asyncHandler(async (req, res, next) => {
  try {
    const lessonData = await lessonService.getLessonData();
    res.status(200).json(lessonData);
  } catch (error) {
    next(error);
  }
})
export const setLessonData = asyncHandler(async (req, res, next) => {
  const setEventTypesSchema = z.object({
    lessons: z.array(
      z.object({
        lessonNumber: z.coerce.number(),
        weekDay: z.coerce.number(),
        teamId: z.coerce.number(),
        subjectId: z.coerce.number(),
        room: z.string(),
        startTime: z.coerce.number(),
        endTime: z.coerce.number()
      })
    )
  })
  let parseResult = setEventTypesSchema.safeParse(req.body);
  if (! parseResult.success || parseResult.data.lessons.map(l => [0, 1, 2, 3, 4].includes(l.weekDay)).includes(false)) {
    res.status(400).json({
      error: "Invalid request format",
      expectedFormat: {
        type: "object",
        properties: {
          lessons: {
            type: "array",
            items: {
              type: "object",
              properties: {
                lessonNumber: { type: "number" },
                weekDay: { enum: [ 0, 1, 2, 3, 4, "0", "1", "2", "3", "4"] },
                teamId: { type: "number" },
                subjectId: { type: "number" },
                room: { type: "string" },
                startTime: { type: "number" },
                endTime: { type: "number" }
              },
              required: ["lessonNumber", "weekDay", "teamId", "subjectId", "room", "startTime", "endTime"]
            }
          }
        },
        required: ["lessons"]
      }
    });
    return
  }
  try {
    await lessonService.setLessonData(parseResult.data.lessons);
    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
})

export default {
  getLessonData,
  setLessonData
};
