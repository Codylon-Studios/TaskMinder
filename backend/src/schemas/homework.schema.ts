import z from "zod";

// optional flag: when true the item is personal (account-scoped) instead of shared/team-scoped.
// accepts a real boolean or a form string ("true"/"false"); defaults to false (shared).
const isPersonalField = z
  .preprocess(val => (typeof val === "string" ? val === "true" : val), z.boolean())
  .optional()
  .default(false);

export const addHomeworkSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.strictObject({
    subjectId: z.coerce.number(),
    content: z.string().trim().min(1).max(1024),
    assignmentDate: z.coerce.number(),
    submissionDate: z.coerce.number(),
    teamId: z.coerce.number(),
    isPersonal: isPersonalField
  })
});

export const editHomeworkSchema = z.object({
  params: z.object({
    id: z.coerce.number()
  }),
  query: z.object({}),
  body: z.strictObject({
    subjectId: z.coerce.number(),
    content: z.string().trim().min(1).max(1024),
    assignmentDate: z.coerce.number(),
    submissionDate: z.coerce.number(),
    teamId: z.coerce.number(),
    isPersonal: isPersonalField
  })
});

export const deleteHomeworkSchema = z.object({
  params: z.object({
    id: z.coerce.number()
  }),
  query: z.object({}),
  body: z.unknown()
});

export const checkHomeworkSchema = z.object({
  params: z.object({
    id: z.coerce.number()
  }),
  query: z.object({}),
  body: z.strictObject({
    checkStatus: z.boolean()
  })
});

export const pinHomeworkSchema = z.object({
  params: z.object({
    id: z.coerce.number()
  }),
  query: z.object({}),
  body: z.strictObject({
    pinStatus: z.boolean()
  })
});

export type editHomeworkTypeParams = z.infer<typeof editHomeworkSchema>["params"];
export type deleteHomeworkTypeParams = z.infer<typeof deleteHomeworkSchema>["params"];
export type checkHomeworkTypeParams = z.infer<typeof checkHomeworkSchema>["params"];
export type pinHomeworkTypeParams = z.infer<typeof pinHomeworkSchema>["params"];

export type addHomeworkTypeBody = z.infer<typeof addHomeworkSchema>["body"];
export type editHomeworkTypeBody = z.infer<typeof editHomeworkSchema>["body"];
export type checkHomeworkTypeBody = z.infer<typeof checkHomeworkSchema>["body"];
export type pinHomeworkTypeBody = z.infer<typeof pinHomeworkSchema>["body"];

