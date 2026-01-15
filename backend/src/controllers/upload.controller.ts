import { Request, Response, NextFunction } from "express";
import logger from "../config/logger";
import { getUploadFileType } from "../schemas/upload.schema";
import uploadService from "../services/upload.service";

export const getUploadMetadata = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const isGetAllData = req.query.all === "true";
    const uploadData = await uploadService.getUploadMetadata(isGetAllData, req.session);
    res.status(200).json(uploadData);
  }
  catch (error) {
    next(error);
  }
};

export const getUploadFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
};

export const editUpload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await uploadService.editUpload(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export const deleteUpload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await uploadService.deleteUpload(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export const queueFileUpload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const files: Express.Multer.File[] = (res.locals.allFiles as Express.Multer.File[]);
    const reservedBytes = res.locals.reservedBytes as bigint;
    
    await uploadService.queueFileUpload(files, req.session, req.body, reservedBytes);
    
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export const createUploadRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await uploadService.addUploadRequest(req.body, req.session);
    res.sendStatus(201);
  }
  catch (error) {
    next(error);
  }
};

export const getUploadRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const uploadRequests = await uploadService.getUploadRequests(req.session);
    res.status(200).json(uploadRequests);
  }
  catch (error) {
    next(error);
  }
};

export const deleteUploadRequest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await uploadService.deleteUploadRequest(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export default {
  getUploadMetadata,
  getUploadFile,
  editUpload,
  deleteUpload,
  queueFileUpload,
  createUploadRequest,
  getUploadRequests,
  deleteUploadRequest
};