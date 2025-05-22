import { NextFunction, Request, Response } from "express";
import { RequestError } from "../@types/requestError";

import logger from "../utils/logger";

export function ErrorHandler(err: RequestError, req: Request, res: Response, next: NextFunction): void {
  try {
    if (err.additionalInformation) {
      logger.write()
      logger.write({padding: { totalWidth: logger.getConsoleDimensions().width, alignment: "center", fillCharacter: "="},
        color: "red", text: " Critical Exception "})
      logger.write({color: "gray", text: "This might be an attack attempt as normal use of the UI should not have caused this error!"})
      logger.write(
        {bold: true, text: req.method},
        {underline: true, text: req.url},
        {color: "red", bold: true, text: err.status},
        `(${err.message})`,
        {color: "red", bold: true, text: err.additionalInformation}
      )
      logger.write()
    }

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
