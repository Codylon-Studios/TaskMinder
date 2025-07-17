import { NextFunction, Request, Response } from "express";
import { RequestError } from "../@types/requestError";
import prisma from "../config/prisma";

// Middleware to enforce session-based access control
// checkAccount, checkClass, checkAccountAndClass, checkPermission(), elseRedirect
const checkAccess = {
  async checkAccount(req: Request, res: Response, next: NextFunction) {
    const { session } = req;

    if (!session.account) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged in",
        expected: true
      };
      throw err;
    }

    try {
      const account = await prisma.account.findUnique({
        where: { accountId: session.account.accountId }
      });

      if (!account) {
        delete session.account;
        const err: RequestError = {
          name: "Unauthorized",
          status: 401,
          message: "Account not found. You have been logged out",
          expected: true
        };
        throw err;
      }
      return next();
    } 
    catch (error) {
      return next(error);
    }
  },

  async checkClass(req: Request, res: Response, next: NextFunction) {
    const { session } = req;

    if (!session.classId) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User has not joined a class",
        expected: true
      };
      throw err;
    }

    try {
      const aClass = await prisma.class.findUnique({
        where: { classId: parseInt(session.classId, 10) }
      });

      if (!aClass) {
        delete session.classId;
        const err: RequestError = {
          name: "Not Found",
          status: 404,
          message: "The selected class no longer exists. Please select another class",
          expected: true
        };
        throw err;
      }
      return next();
    } 
    catch (error) {
      return next(error);
    }
  },

  async checkAccountAndClass(req: Request, res: Response, next: NextFunction) {
    const { session } = req;

    if (!session.account) {
      const err: RequestError = {
        name: "Unauthorized",
        status: 401,
        message: "User not logged in",
        expected: true
      };
      throw err;
    }
    if (!session.classId) {
      const err: RequestError = {
        name: "Forbidden",
        status: 403,
        message: "User has not joined a class",
        expected: true
      };
      throw err;
    }

    try {
      const [account, aClass] = await Promise.all([
        prisma.account.findUnique({ where: { accountId: session.account.accountId } }),
        prisma.class.findUnique({ where: { classId: parseInt(session.classId, 10) } })
      ]);

      if (!account) {
        delete session.account;
        const err: RequestError = {
          name: "Unauthorized",
          status: 401,
          message: "Your account could not be found. You have been logged out",
          expected: true
        };
        throw err;
      }

      if (!aClass) {
        delete session.classId;
        const err: RequestError = {
          name: "Not Found",
          status: 404,
          message: "The selected class no longer exists. Please select another class",
          expected: true
        };
        throw err;
      }
      return next();
    } 
    catch (error) {
      return next(error);
    }
  },
  // check permission (0, 1, 2, 3)
  checkPermissionLevel(permissionLevel: number) {
    return async (req: Request, res: Response, next: NextFunction) => {
      let effectivePermission = 0;

      if (req.session.account) {
        const accountPermission = await prisma.account.findUnique({
          where: {
            accountId: req.session.account.accountId
          },
          select: {
            permissionSetting: true
          }
        });
        effectivePermission = accountPermission!.permissionSetting ?? 0;
      }
      else {
        const classPermission = await prisma.class.findUnique({
          where: {
            classId: parseInt(req.session.classId!)
          },
          select: {
            permissionDefaultSetting: true
          }
        });
        effectivePermission = classPermission!.permissionDefaultSetting ?? 0;
      }

      if (effectivePermission >= permissionLevel) {
        return next();
      }

      const err: RequestError = {
        name: "Forbidden",
        status: 403,
        message: "The permission level is not sufficient to perform this action",
        expected: true
      };
      throw err;
    };
  },
  elseRedirect(req: Request, res: Response, next: NextFunction) {
    if (!req.session.classId) {
      return res.redirect(302, "/join");
    }
    return next();
  }
};

export default checkAccess;