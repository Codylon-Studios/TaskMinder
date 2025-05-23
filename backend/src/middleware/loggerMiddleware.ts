import { NextFunction, Request, Response } from "express";

import logger from "../utils/logger";
import { isJSON } from "validator";

const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  const originalSend = res.send;

  res.send = function (this: any, body: any) {
    try {
      let loggedBody = body
      if (isJSON(body)) {
        let json = JSON.parse(body)
        if (json.error == "Invalid request format" && json.expectedFormat != undefined && json.expectedFormat != null) {
          loggedBody = "Invalid request format"
        }
      }

      const d = new Date()
      let dateStr = `[${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${(d.getDate()).toString().padStart(2, "0")} ` +
        `${(d.getHours()).toString().padStart(2, "0")}:${(d.getMinutes()).toString().padStart(2, "0")}]`

      const duration = Date.now() - start;

      let statusCodeColor = "";
      if (/2\d{2}/.test(res.statusCode.toString())) statusCodeColor = "green";
      if (/4\d{2}/.test(res.statusCode.toString())) statusCodeColor = "yellow";
      if (/5\d{2}/.test(res.statusCode.toString())) statusCodeColor = "red";

      let durationColor = "";
      if (duration < 50) durationColor = "green";
      else if (duration < 200) durationColor = "yellow";
      else durationColor = "red";
      
      logger.write(
        {color: "magenta", text: "[TaskMinder]"},
        {color: "gray", text: dateStr},
        {padding: {totalWidth: 5, alignment: "right"}, color: durationColor, text: `${duration}ms`},
        {bold: true, padding: {totalWidth: 4}, text: req.method},
        {underline: true, text: req.url},
        {color: statusCodeColor, bold: true, text: res.statusCode},
        (! /2\d{2}/.test(res.statusCode.toString())) ? `(${loggedBody})` : ""
      )
    }
    catch (err) {
      logger.warn("An error occured in the logger middleware:\t", err)
    }
    return originalSend.apply(this, [body]);
  };

  next();
};

export default loggerMiddleware;
