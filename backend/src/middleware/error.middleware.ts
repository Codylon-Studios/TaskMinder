import { NextFunction, Request, Response } from "express";
import { RequestError } from "../@types/requestError";
import logger from "../config/logger";
import { cleanupTempFiles, rollbackStorageQuota } from "../utils/upload.cleanup";

export async function ErrorHandler(err: RequestError, req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Clean up temp files if any error occurs after upload (skip if already cleaned up in validation)
    await cleanupTempFiles(req, res, "non-success response/abort");

    // Roll back reserved storage quota if set
    await rollbackStorageQuota(req, res, "error");

    if (err.expected) {
      res.status(err.status ?? 500).send(err.message);
    }
    else {
      logger.error(err);
      res.status(500).send("Internal Server Error");
    }
  }
  catch (err) {
    logger.warn("An error occured in the error handler middleware:\t", err);
    res.status(500).send("Internal Server Error");
  }
  next();
}
