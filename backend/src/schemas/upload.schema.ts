import z, { strictObject } from "zod";
import { FileTypes } from "../config/upload";

export const getUploadMetadataSchema = z.object({
  params: z.object({}),
  query: z.object({
    all: z.enum(["true", "false"]).optional()
  }),
  body: strictObject({}).optional()
});

export const getUploadFileSchema = z.object({
  params: z.object({
    fileId: z.coerce.number()
  }),
  query: z.object({
    action: z.enum(["download", "preview"])
  }),
  body: strictObject({}).optional()
});

export const uploadFileSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: strictObject({
    uploadName: z.string().trim().min(1),
    uploadDescription: z.string().trim().min(1).nullable(),
    uploadType: z.enum(FileTypes),
    teamId: z.coerce.number()
  })
});

export const editUploadSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: strictObject({
    uploadId: z.coerce.number(),
    uploadName: z.string().trim().min(1),
    uploadDescription: z.string().trim().min(1).nullable(),
    uploadType: z.enum(FileTypes),
    teamId: z.coerce.number(),
    // We need some normalization because multipart fields arrive as strings
    changeFiles: z.union([
      z.boolean(),
      z.enum(["true", "false"]).transform(v => v === "true")
    ])
  })
});

export const deleteUploadSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: strictObject({
    uploadId: z.coerce.number()
  })
});

export const addUploadRequestSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: strictObject({
    uploadRequestName: z.string().trim().min(1).max(255),
    teamId: z.coerce.number()
  })
});

export const deleteUploadRequestSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: strictObject({
    uploadRequestId: z.coerce.number()
  })
});

export type getUploadFileType = z.infer<typeof getUploadFileSchema>;
export type editUploadType = z.infer<typeof editUploadSchema>;
export type deleteUploadType = z.infer<typeof deleteUploadSchema>;
export type addUploadRequestType = z.infer<typeof addUploadRequestSchema>;
export type deleteUploadRequestType = z.infer<typeof deleteUploadRequestSchema>;

export type uploadFileTypeBody = z.infer<typeof uploadFileSchema>["body"];
export type editUploadTypeBody = z.infer<typeof editUploadSchema>["body"];
export type deleteUploadTypeBody = z.infer<typeof deleteUploadSchema>["body"];
export type addUploadRequestTypeBody = z.infer<typeof addUploadRequestSchema>["body"];
export type deleteUploadRequestTypeBody = z.infer<typeof deleteUploadRequestSchema>["body"];