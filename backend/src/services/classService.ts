import { RequestError } from "../@types/requestError";
import { Session, SessionData } from "express-session";

const classService = {
  async getClassCode(session: Session & Partial<SessionData>) {
    if (!(session.classJoined)) {
      let err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged in",
        expected: true,
      }
      throw err;
    }
    const classCode = process.env.CLASSCODE;
    return classCode;
  }
}

export default classService;
