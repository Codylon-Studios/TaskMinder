import { Request, Response, NextFunction } from "express";
import logger from "../config/logger";

export const loggerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    
    logger.info("", {
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      duration
    });
  });

  next();
};