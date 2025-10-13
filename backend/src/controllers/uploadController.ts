import uploadService from "../services/uploadService";
import asyncHandler from "express-async-handler";
import logger from "../utils/logger";
import { getUploadFileType } from "../schemas/uploadSchema";


export const getUploadDataList = asyncHandler(async (req, res, next) => {
  try {
    const isGetAllData = req.query.all === "true";
    const uploadData = await uploadService.getUploadDataList(isGetAllData, req.session);
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

export const renameUploadFile = asyncHandler(async (req, res, next) => {
  try {
    await uploadService.renameUploadFile(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export const deleteUploadFile = asyncHandler(async (req, res, next) => {
  try {
    await uploadService.deleteUploadFile(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export const setUploadFile = asyncHandler(async (req, res, next) => {
  try {
    const verifiedMimes = (res.locals.verifiedMimes as string[]) ?? [];
    const files: Express.Multer.File[] = (res.locals.allFiles as Express.Multer.File[]) ?? [];
    const fileGroupName: string | undefined = req.body?.fileGroupName?.toString()?.trim() || undefined;

    await uploadService.setUploadFile(files, verifiedMimes, req.session, fileGroupName);
    res.sendStatus(201);
  }
  catch (error) {
    next(error);
  }
});

// new: rename/delete group
export const renameUploadFileGroup = asyncHandler(async (req, res, next) => {
  try {
    await uploadService.renameFileGroup(req.body, req.session);
    res.sendStatus(200);
  } 
  catch (error) {
    next(error);
  }
});

export const deleteUploadFileGroup = asyncHandler(async (req, res, next) => {
  try {
    await uploadService.deleteFileGroup(req.body, req.session);
    res.sendStatus(200);
  } 
  catch (error) {
    next(error);
  }
});

export default {
  getUploadDataList,
  getUploadFile,
  renameUploadFile,
  deleteUploadFile,
  setUploadFile,
  // new
  renameUploadFileGroup,
  deleteUploadFileGroup
};
