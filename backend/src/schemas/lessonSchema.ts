import z from "zod";

export const setLessonDataSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.strictObject({
    lessons: z.array(
      z.object({
        lessonNumber: z.coerce.number(),
        weekDay: z.coerce.number().int().min(0).max(4),
        teamId: z.coerce.number(),
        subjectId: z.coerce.number(),
        room: z.string().trim().min(1),
        startTime: z.coerce.number(),
        endTime: z.coerce.number()
      })
    )
  })
});

export type setLessonDataType = z.infer<typeof setLessonDataSchema>;

export type setLessonDataTypeBody = z.infer<typeof setLessonDataSchema>["body"];