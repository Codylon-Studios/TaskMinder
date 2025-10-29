import z, { strictObject } from "zod";
import { FileTypes } from "../config/upload";

export const getUploadMetadataSchema = z.object({
  params: z.object({}),
  query: z.object({
    all: z.enum(["true", "false"]).optional().transform(val => val === "true")
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

export const uploadFileSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: z.strictObject({
    uploadName: z.string(),
    uploadType: z.enum(FileTypes),
    teamId: z.coerce.number(),
    // Files are handled by multer/form-data
    files: z.any().optional()
  })
});

export const renameUploadSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: strictObject({
    uploadId: z.coerce.number(),
    newUploadName: z.string().trim().min(1)
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
export type renameUploadType = z.infer<typeof renameUploadSchema>;
export type deleteUploadType = z.infer<typeof deleteUploadSchema>;

export type setUploadFileTypeBody = z.infer<typeof uploadFileSchema>["body"];
export type renameUploadTypeBody = z.infer<typeof renameUploadSchema>["body"];
export type deleteUploadTypeBody = z.infer<typeof deleteUploadSchema>["body"];