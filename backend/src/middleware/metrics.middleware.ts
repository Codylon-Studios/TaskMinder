import { Request, Response, NextFunction } from "express";
import { httpRequestDurationMicroseconds } from "../config/prom.client";

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const end = httpRequestDurationMicroseconds.startTimer();

  res.on("finish", () => {
    const route = req.route ? req.route.path : req.path;
    end({ route, code: res.statusCode, method: req.method });
  });

  next();
};