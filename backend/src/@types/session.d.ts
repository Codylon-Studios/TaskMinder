import 'express-session';

declare module 'express-session' {
  interface SessionData {
    account?: {
      accountId: number;
      username: string;
    };
    loggedIn: boolean;
    classJoined: boolean;
    csrfToken?: string;
  }
}
