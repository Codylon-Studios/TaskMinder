import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import logger from "../config/logger.js";

export const loggerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = randomUUID();
  res.locals.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const errorMessage = res.locals.errorMessage;
    
    logger.info("", {
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      duration,
      ...(errorMessage && { errorMessage })
    });
  });

  next();
};