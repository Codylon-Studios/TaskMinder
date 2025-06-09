import { RequestError } from "../@types/requestError";
import { Session, SessionData } from "express-session";

const classService = {
  async getClassCode(session: Session & Partial<SessionData>) {
    if (!session.classJoined) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged into class",
        expected: true,
      };
      throw err;
    }
    const classCode = process.env.CLASSCODE;
    return classCode;
  },
};

export default classService;
