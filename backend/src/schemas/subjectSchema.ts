import z from "zod";

export const setSubjectsSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.strictObject({
    subjects: z.array(
      z.object({
        subjectId: z.union([z.literal(""), z.coerce.number()]),
        subjectNameLong: z.string().trim().min(1),
        subjectNameShort: z.string().trim().min(1),
        subjectNameSubstitution: z.array(z.string()).nullable(),
        teacherGender: z.enum(["d", "w", "m"]),
        teacherNameLong: z.string().trim().min(1),
        teacherNameShort: z.string().trim().min(1),
        teacherNameSubstitution: z.array(z.string()).nullable()
      })
    )
  })
});

export type setSubjectsType = z.infer<typeof setSubjectsSchema>;

export type setSubjectsTypeBody = z.infer<typeof setSubjectsSchema>["body"];