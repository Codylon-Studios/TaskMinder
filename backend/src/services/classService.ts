import { RequestError } from "../@types/requestError";
import { Session, SessionData } from "express-session";
import prisma from "../config/prisma";

function generateRandomBase62String(length: number = 20): string {
  const chars: string[] = [];

  // Add digits 0–9 twice
  for (let i = 0; i < 10; i++) {
    chars.push(i.toString());
    chars.push(i.toString());
  }

  // Add uppercase A–Z
  for (let i = 65; i <= 90; i++) {
    chars.push(String.fromCharCode(i));
  }

  // Add lowercase a–z
  for (let i = 97; i <= 122; i++) {
    chars.push(String.fromCharCode(i));
  }

  // Build the random string
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * (62));
    if (randomIndex < 0 || randomIndex > 61) {
      throw new Error(`Random index out of bounds: ${randomIndex}`);
    }
    result += chars[randomIndex];
  }

  return result;
}


const classService = {
  async getClassInfo(session: Session & Partial<SessionData>) {
    if (!session.classId) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged into class",
        expected: true
      };
      throw err;
    }

    const classExists = await prisma.class.findUnique({
      where: {
        classId: parseInt(session.classId)
      }
    });

    if (!classExists){
      delete session.classId;
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "No class mapped to session.classId, deleting classId from session",
        expected: true
      };
      throw err;
    }

    const classInfo = await prisma.class.findUnique({
      where: {
        classId: parseInt(session.classId)
      }
    });
    if (!classInfo){
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "Can not find class",
        expected: true
      };
      throw err;
    }
    return classInfo;
  },

  async createClass(
    reqData: {
      classDisplayName: string;
      classCode: string;
      dsbMobileActivated: boolean;
      dsbMobileUser?: string | null;
      dsbMobilePassword?: string | null;
      dsbMobileClass?: string | null;
    },
    session: Session & Partial<SessionData>
  ) {
    const {
      classDisplayName,
      classCode,
      dsbMobileActivated,
      dsbMobileUser,
      dsbMobilePassword,
      dsbMobileClass
    } = reqData;
  
    if (!session.account) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Not logged in",
        additionalInformation: "The requesting session is not logged in!",
        expected: true
      };
      throw err;
    }
    if (session.classId) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User logged into class",
        expected: true
      };
      throw err;
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseData: any = {
      className: classDisplayName,
      classCode: classCode,
      classCreated: Date.now(),
      isTestClass: false,
      dsbMobileActivated: dsbMobileActivated
    };
  
    if (dsbMobileActivated) {
      if (!dsbMobileUser || !dsbMobilePassword || !dsbMobileClass) {
        const err: RequestError = {
          name: "Bad Request",
          status: 400,
          message: "DSB credentials are required when dsbMobileActivated is true.",
          expected: true
        };
        throw err;
      }
  
      baseData.dsbMobileUser = dsbMobileUser;
      baseData.dsbMobilePassword = dsbMobilePassword;
      baseData.dsbMobileClass = dsbMobileClass;
    }
  
    await prisma.class.create({
      data: baseData
    });
  },
  
  async createTestClass(
    reqData: {
      classDisplayName: string;
      classCode: string;
      dsbMobileActivated: boolean;
      dsbMobileUser?: string | null;
      dsbMobilePassword?: string | null;
      dsbMobileClass?: string | null;
    },
    session: Session & Partial<SessionData>
  ) {
    const {
      classDisplayName,
      classCode,
      dsbMobileActivated,
      dsbMobileUser,
      dsbMobilePassword,
      dsbMobileClass
    } = reqData;
  
    if (!session.account) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Not logged in",
        additionalInformation: "The requesting session is not logged in!",
        expected: true
      };
      throw err;
    }
    if (session.classId) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User logged into class",
        expected: true
      };
      throw err;
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseData: any = {
      className: classDisplayName,
      classCode: classCode,
      classCreated: Date.now(),
      isTestClass: true,
      dsbMobileActivated: dsbMobileActivated
    };
  
    if (dsbMobileActivated) {
      if (!dsbMobileUser || !dsbMobilePassword || !dsbMobileClass) {
        const err: RequestError = {
          name: "Bad Request",
          status: 400,
          message: "DSB credentials are required when dsbMobileActivated is true.",
          expected: true
        };
        throw err;
      }
  
      baseData.dsbMobileUser = dsbMobileUser;
      baseData.dsbMobilePassword = dsbMobilePassword;
      baseData.dsbMobileClass = dsbMobileClass;
    }
  
    await prisma.class.create({
      data: baseData
    });
  },
  async generateNewClassCode(session: Session & Partial<SessionData>){
    if (!session.account) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Not logged in",
        additionalInformation: "The requesting session is not logged in!",
        expected: true
      };
      throw err;
    }
    if (session.classId) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User logged into class",
        expected: true
      };
      throw err;
    }
    //generate new class code, look if already used -> if not, return value
    // Try until a unique code is found
    let code: string;
    const maxAttempts = 10;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      code = generateRandomBase62String();
      const exists = await prisma.class.findUnique({
        where: {
          classCode: code
        }
      });
      if (!exists) {
        return code;
      }
    }

    // If unique code wasn't found after 10 tries, fail gracefully
    const err: RequestError = {
      name: "Server Error",
      status: 500,
      message: "Could not generate unique class code",
      additionalInformation: "All randomly generated class codes were already in use.",
      expected: false
    };
    throw err;
  },
  async leaveClass(session: Session & Partial<SessionData>){
    if (!session.classId) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged into class",
        expected: true
      };
      throw err;
    }
    // currently allow that a class with no members can exist
    // add deleting stuff when last user with user role addition
    delete session.classId;
    if (session.account) {
      await prisma.joinedClass.delete({
        where: {
          accountId: session.account.accountId
        }
      });
    }
  },
  async deleteClass(session: Session & Partial<SessionData>){
    if (!session.account) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Not logged in",
        additionalInformation: "The requesting session is not logged in!",
        expected: true
      };
      throw err;
    }
    if (!session.classId) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged into class",
        expected: true
      };
      throw err;
    }
    const classExists = await prisma.class.findUnique({
      where: {
        classId: parseInt(session.classId)
      }
    });

    if (!classExists){
      delete session.classId;
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "No class mapped to session.classId, deleting classId from session",
        expected: true
      };
      throw err;
    }
    // delete class
    // all corresponding teams, homework, event data etc. will be deleted through onCascade
    await prisma.class.delete({
      where: {
        classId: parseInt(session.classId)
      }
    });
    delete session.classId;
  },
  async updateDSBMobileData(
    reqData: {
      dsbMobileActivated: boolean;
      dsbMobileUser?: string | null;
      dsbMobilePassword?: string | null;
      dsbMobileClass?: string | null;
    },
    session: Session & Partial<SessionData>
  ){
    const {
      dsbMobileActivated,
      dsbMobileUser,
      dsbMobilePassword,
      dsbMobileClass
    } = reqData;

    if (!session.classId) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged into class",
        expected: true
      };
      throw err;
    }
    if (!session.account) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Not logged in",
        additionalInformation: "The requesting session is not logged in!",
        expected: true
      };
      throw err;
    }

    const classExists = await prisma.class.findUnique({
      where: {
        classId: parseInt(session.classId)
      }
    });

    if (!classExists){
      delete session.classId;
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "No class mapped to session.classId, deleting classId from session",
        expected: true
      };
      throw err;
    }

    await prisma.class.update({
      where: {
        classId: parseInt(session.classId)
      },
      data: {
        dsbMobileActivated: dsbMobileActivated,
        dsbMobileUser: dsbMobileUser,
        dsbMobilePassword: dsbMobilePassword,
        dsbMobileClass: dsbMobileClass
      }
    });
  }
};

export default classService;
