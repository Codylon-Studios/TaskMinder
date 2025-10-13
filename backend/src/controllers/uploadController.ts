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
    const verifiedMime = res.locals.verifiedMime as string;
    // req.file certainly exists because of verifyFileType middleware
    const tempFileData = req.file!;
    await uploadService.setUploadFile(tempFileData, verifiedMime, req.session);
    res.sendStatus(201);
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
  setUploadFile
};
