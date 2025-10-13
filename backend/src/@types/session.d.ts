import "express-session";
import "express";

declare module "express-session" {
  interface SessionData {
    account?: {
      accountId: number;
      username: string;
    };
    classId: string;
    csrfToken?: string;
    generatedClassCode?: string;
  }
}
declare module "express" {
  interface Request {
    file?: Multer.File;
    allFiles?: Multer.File[];
  }
}
