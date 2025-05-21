import { NextFunction, Request, Response } from "express";
import { RequestError } from "../@types/requestError";

import logger from "../utils/logger";

export function ErrorHandler(err: RequestError, req: Request, res: Response, next: NextFunction): void {
  try {

    if (err.expected) {
      res.status(err.status ?? 500).send(err.message)
    }
    else {
      console.log(err)
      res.status(500).send("Internal Server Error")
    }
  }
  catch (err) {
    logger.warn("An error occured in the error handler middleware:\t", err)
    res.status(500).send("Internal Server Error")
  }
};
