import z from "zod";

export const addHomeworkSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.strictObject({
    subjectId: z.coerce.number(),
    content: z.string().trim().min(1),
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
    content: z.string().trim().min(1),
    assignmentDate: z.coerce.number(),
    submissionDate: z.coerce.number(),
    teamId: z.coerce.number()
  })
});


export type addHomeworkType = z.infer<typeof addHomeworkSchema>;
export type checkHomeworkType = z.infer<typeof checkHomeworkSchema>;
export type deleteHomeworkType = z.infer<typeof deleteHomeworkSchema>;
export type editHomeworkType = z.infer<typeof editHomeworkSchema>;

export type addHomeworkTypeBody = z.infer<typeof addHomeworkSchema>["body"];
export type checkHomeworkTypeBody = z.infer<typeof checkHomeworkSchema>["body"];
export type deleteHomeworkTypeBody = z.infer<typeof deleteHomeworkSchema>["body"];
export type editHomeworkTypeBody = z.infer<typeof editHomeworkSchema>["body"];

