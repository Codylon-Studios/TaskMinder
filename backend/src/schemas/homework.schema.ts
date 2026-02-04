import z from "zod";

export const addHomeworkSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.strictObject({
    subjectId: z.coerce.number(),
    content: z.string().trim().min(1).max(1024),
    assignmentDate: z.coerce.number(),
    submissionDate: z.coerce.number(),
    teamId: z.coerce.number()
  })
});

export const checkHomeworkSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.strictObject({
    homeworkId: z.coerce.number(),
    checkStatus: z.boolean()
  })
});

export const deleteHomeworkSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.strictObject({
    homeworkId: z.coerce.number()
  })
});

export const editHomeworkSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.strictObject({
    homeworkId: z.coerce.number(),
    subjectId: z.coerce.number(),
    content: z.string().trim().min(1).max(1024),
    assignmentDate: z.coerce.number(),
    submissionDate: z.coerce.number(),
    teamId: z.coerce.number()
  })
});

export const pinHomeworkSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.strictObject({
    homeworkId: z.coerce.number(),
    pinStatus: z.boolean()
  })
});

export type addHomeworkTypeBody = z.infer<typeof addHomeworkSchema>["body"];
export type checkHomeworkTypeBody = z.infer<typeof checkHomeworkSchema>["body"];
export type deleteHomeworkTypeBody = z.infer<typeof deleteHomeworkSchema>["body"];
export type editHomeworkTypeBody = z.infer<typeof editHomeworkSchema>["body"];
export type pinHomeworkTypeBody = z.infer<typeof pinHomeworkSchema>["body"];

