import "express-session";

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
