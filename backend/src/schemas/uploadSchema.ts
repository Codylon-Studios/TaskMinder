import z, { strictObject } from "zod";

export const getUploadFileMetadataSchema = z.object({
  params: z.object({}),
  query: z.object({
    all: z.boolean()
  }),
  body: z.strictObject({})
});

export const getUploadFileSchema = z.object({
  params: z.object({
    fileId: z.coerce.number()
  }),
  query: z.object({
    action: z.enum(["download", "preview"])
  }),
  body: z.strictObject({})
});

export const renameUploadFileSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: strictObject({
    fileId: z.coerce.number(),
    newFileName: z.string().trim().min(1)
  })
});

export const deleteUploadFileSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: strictObject({
    fileId: z.coerce.number()
  })
});

export type getUploadFileType = z.infer<typeof getUploadFileSchema>;
export type renameUploadFileType = z.infer<typeof renameUploadFileSchema>;
export type deleteUploadFileType = z.infer<typeof deleteUploadFileSchema>;

export type renameUploadFileTypeBody = z.infer<typeof renameUploadFileSchema>["body"];
export type deleteUploadFileTypeBody = z.infer<typeof deleteUploadFileSchema>["body"];