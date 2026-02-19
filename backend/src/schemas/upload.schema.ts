import z, { strictObject } from "zod";
import { FileTypes } from "../config/upload.js";

export const getUploadMetadataSchema = z.object({
  // omit body due to GET request
  params: z.object({}),
  query: z.object({
    all: z.enum(["true", "false"])
      .default("false")
  })
});

export const getUploadFileSchema = z.object({
  // omit body due to GET request
  params: z.object({
    id: z.coerce.number()
  }),
  query: z.object({
    action: z.enum(["download", "preview"])
  })
});

export const uploadFileSchema = z.object({
  params: z.object({}),
  query: z.object({}),
  body: strictObject({
    uploadName: z.string().trim().min(1).max(256),
    uploadDescription: z.string().trim().min(1).max(1024).nullable().or(z.literal("")),
    uploadType: z.enum(FileTypes),
    teamId: z.coerce.number()
  })
});

export const editUploadSchema = z.object({
  params: z.object({
    id: z.coerce.number()
  }),
  query: z.object({}),
  body: strictObject({
    uploadName: z.string().trim().min(1).max(256),
    uploadDescription: z.string().trim().min(1).max(1024).nullable().or(z.literal("")),
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
  params: z.object({
    id: z.coerce.number()
  }),
  query: z.object({}),
  body: strictObject({})
});

export const pinUploadSchema = z.object({
  params: z.object({
    id: z.coerce.number()
  }),
  query: z.object({}),
  body: strictObject({
    pinStatus: z.boolean()
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
  params: z.object({
    id: z.coerce.number()
  }),
  query: z.object({}),
  body: strictObject({})
});

export type getUploadFileQuery = z.infer<typeof getUploadFileSchema>["query"];
export type getUploadMetadataQuery = z.infer<typeof getUploadMetadataSchema>["query"];

export type getUploadFileParams = z.infer<typeof getUploadFileSchema>["params"];
export type editUploadTypeParams = z.infer<typeof editUploadSchema>["params"];
export type deleteUploadTypeParams = z.infer<typeof deleteUploadSchema>["params"];
export type pinUploadTypeParams = z.infer<typeof pinUploadSchema>["params"];
export type deleteUploadRequestTypeParams = z.infer<typeof deleteUploadRequestSchema>["params"];

export type uploadFileTypeBody = z.infer<typeof uploadFileSchema>["body"];
export type editUploadTypeBody = z.infer<typeof editUploadSchema>["body"];
export type pinUploadTypeBody = z.infer<typeof pinUploadSchema>["body"];
export type addUploadRequestTypeBody = z.infer<typeof addUploadRequestSchema>["body"];