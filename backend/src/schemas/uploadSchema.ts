import z, { strictObject } from "zod";

export const getUploadMetadataSchema = z.object({
  params: z.object({}),
  query: z.object({
    all: z.enum(["true", "false"]).optional()
  }),
  body: z.any().optional()
});

export const getUploadFileSchema = z.object({
  params: z.object({
    fileId: z.coerce.number()
  }),
  query: z.object({
    action: z.enum(["download", "preview"])
  }),
  body: z.any().optional()
});

export const uploadFileSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.any().optional()
});

export const editUploadSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: strictObject({
    uploadId: z.coerce.number(),
    uploadName: z.string().trim().min(1),
    uploadType: z.string().trim().min(1),
    teamId: z.coerce.number()
  })
});

export const deleteUploadSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: strictObject({
    uploadId: z.coerce.number()
  })
});

export type getUploadFileType = z.infer<typeof getUploadFileSchema>;
export type editUploadType = z.infer<typeof editUploadSchema>;
export type deleteUploadType = z.infer<typeof deleteUploadSchema>;

export type uploadFileTypeBody = z.infer<typeof uploadFileSchema>["body"];
export type editUploadTypeBody = z.infer<typeof editUploadSchema>["body"];
export type deleteUploadTypeBody = z.infer<typeof deleteUploadSchema>["body"];