import "express-session";
import "express";

declare module "express-session" {
  interface SessionData {
    account?: {
      accountId: number;
      username: string;
    };
    classId?: string;
    csrfToken?: string;
  }
}
declare module "express" {
  interface Request {
    file?: Express.Multer.File;
    allFiles?: Express.Multer.File[];
    apiVersion?: string;
  }
}