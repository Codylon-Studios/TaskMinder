import { RequestError } from "../@types/requestError";
import { Session, SessionData } from "express-session";

const classService = {
  async getClassInfo(session: Session & Partial<SessionData>) {
    if (!session.classJoined) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged into class",
        expected: true
      };
      throw err;
    }
    const classCode = process.env.CLASSCODE;
    return classCode;
  },
  async createClass(
    reqData: {
      className: string;
      classCode: string;
    },
    session: Session & Partial<SessionData>
  ){

  },
  async createTestClass(
    reqData: {
      className: string;
      classCode: string;
    },
    session: Session & Partial<SessionData>
  ){

  },
  async generateNewClassCode(session: Session & Partial<SessionData>){

  },
  async leaveClass(session: Session & Partial<SessionData>){

  }

};

export default classService;
