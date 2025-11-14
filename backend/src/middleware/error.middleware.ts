import { NextFunction, Request, Response } from "express";
import { RequestError } from "../@types/requestError";
import fs from "fs/promises";
import logger from "../config/logger";

export async function ErrorHandler(err: RequestError, req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Clean up temp files if any error occurs after upload
    if (req.allFiles && req.allFiles.length > 0) {
      await Promise.all(
        req.allFiles.map(file =>
          fs.unlink(file.path).catch(unlinkErr => {
            logger.warn(`Failed to cleanup temp file ${file.path}:, ${unlinkErr}`);
          })
        )
      );
      logger.info(`Cleaned up ${req.allFiles.length} temp file(s) due to error`);
    }
    if (err.additionalInformation) {
      logger.warn("Critical Exception: This might be an attack attempt as normal use of the UI should not have caused this error!");
    }

    if (err.expected) {
      res.status(err.status ?? 500).send(err.message);
    }
    else {
      console.log(err);
      res.status(500).send("Internal Server Error");
    }
  }
  catch (err) {
    logger.warn("An error occured in the error handler middleware:\t", err);
    res.status(500).send("Internal Server Error");
  }
  next();
}
