import z from "zod";

export const setSubjectsSchema = z.object({
  params: z.object({}).optional(),
  query: z.object({}).optional(),
  body: z.strictObject({
    subjects: z.array(
      z.object({
        subjectId: z.union([z.literal(""), z.coerce.number()]),
        subjectNameLong: z.string(),
        subjectNameShort: z.string(),
        subjectNameSubstitution: z.array(z.string()).nullable(),
        teacherGender: z.enum(["d", "w", "m"]),
        teacherNameLong: z.string(),
        teacherNameShort: z.string(),
        teacherNameSubstitution: z.array(z.string()).nullable()
      })
    )
  })
});

export type setSubjectsType = z.infer<typeof setSubjectsSchema>;

export type setSubjectsTypeBody = z.infer<typeof setSubjectsSchema>["body"];