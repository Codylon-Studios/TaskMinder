import "express-session";

declare module "express-session" {
  interface SessionData {
    account?: {
      accountId: number;
      username: string;
    };
    loggedIn: boolean;
    classId: string;
    csrfToken?: string;
  }
}
