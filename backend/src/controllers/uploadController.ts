import uploadService from "../services/uploadService";
import asyncHandler from "express-async-handler";
import logger from "../config/logger";
import { getUploadFileType } from "../schemas/uploadSchema";

export const getUploadMetadata = asyncHandler(async (req, res, next) => {
  try {
    const isGetAllData = req.query.all === "true";
    const uploadData = await uploadService.getUploadMetadata(isGetAllData, req.session);
    res.status(200).json(uploadData);
  }
  catch (error) {
    next(error);
  }
});

export const getUploadFile = asyncHandler(async (req, res, next) => {
  try {
    const { stream, headers } = await uploadService.getUploadFile({
      fileIdParam: parseInt(req.params.fileId, 10),
      action: req.query.action as getUploadFileType["query"]["action"],
      classId: req.session.classId!
    });

    res.setHeader("Content-Type", headers["Content-Type"]);
    res.setHeader("Content-Disposition", headers["Content-Disposition"]);
    res.setHeader("Cache-Control", headers["Cache-Control"]);

    stream.on("error", err => {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        logger.error("File not found on disk during streaming.");
        res.status(404).json({ message: "File not found on server." });
        return;
      }
      next(err);
    });
    stream.pipe(res);
  }
  catch (error) {
    next(error);
  }
});

export const renameUpload = asyncHandler(async (req, res, next) => {
  try {
    await uploadService.renameUpload(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export const deleteUpload = asyncHandler(async (req, res, next) => {
  try {
    await uploadService.deleteUpload(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export const queueFileUpload = asyncHandler(async (req, res, next) => {
  try {
    const files: Express.Multer.File[] = (res.locals.allFiles as Express.Multer.File[]);
    const reservedBytes = res.locals.reservedBytes as bigint;
    
    const result = await uploadService.queueFileUpload(files, req.session, req.body, reservedBytes);
    
    res.status(200).json({
      uploadId: result.uploadId,
      status: "queued",
      filesCount: files.length,
      message: "Files uploaded successfully and queued for processing"
    });
  }
  catch (error) {
    next(error);
  }
});

export default {
  getUploadMetadata,
  getUploadFile,
  renameUpload,
  deleteUpload,
  queueFileUpload
};