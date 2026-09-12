import { NextFunction, Request, Response } from "express";
import { RequestError } from "../@types/requestError.js";
import logger from "../config/logger.js";
import { performUploadCleanup } from "../utils/upload.cleanup.js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function ErrorHandler(err: RequestError, req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Clean up temp files and roll back reserved storage quota if needed
    await performUploadCleanup(req, res, "error");

    if (err.expected) {
      res.status(err.status ?? 500).send(err.message);
      res.locals.errorMessage = err.message;
    }
    else {
      logger.error("Unhandled error: " + err, {
        requestId: res.locals.requestId,
        method: req.method,
        path: req.originalUrl || req.url,
        error: err instanceof Error ? err.message : err
      });
      res.status(500).send("Internal Server Error");
    }
  }
  catch (err) {
    logger.warn("An error occurred in the error handler middleware", {
      requestId: res.locals.requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      error: err instanceof Error ? err.message : err
    });
    res.status(500).send("Internal Server Error");
  }
}
