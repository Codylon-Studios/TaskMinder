import { NextFunction, Request, Response } from "express";
import { RequestError } from "../@types/requestError";

// Middleware to enforce session-based access control
const checkAccess = {
  elseRedirect(req: Request, res: Response, next: NextFunction) {
    if (req.session.classId) {
      return next();
    }
    return res.redirect(302, "/join");
  },
  elseUnauthorized(req: Request, res: Response, next: NextFunction) {
    if (req.session.classId) {
      return next();
    }
    const err: RequestError = {
      name: "Unauthorized",
      status: 401,
      message: "User hasn't joined class",
      expected: true
    };
    throw err;
  }
};

export default checkAccess;
