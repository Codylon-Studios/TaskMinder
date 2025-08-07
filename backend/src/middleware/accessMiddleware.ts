import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { RequestError } from "../@types/requestError";

const ROLES = {
  MEMBER: 0,
  EDITOR: 1,
  MANAGER: 2,
  ADMIN: 3
} as const;

type AccessRequirement = "ACCOUNT" | "CLASS" | keyof typeof ROLES;

export default function checkAccess(requirements: AccessRequirement[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (requirements.includes("ACCOUNT")) {
        await checkAccountAccess(req);
      }

      if (requirements.includes("CLASS")) {
        await checkClassAccess(req, res);
        if (res.headersSent) {
          return;
        }
      }

      const roleLevels = requirements.filter(
        r => r in ROLES
      ) as (keyof typeof ROLES)[];
      if (roleLevels.length > 0) {
        const requiredPermission = Math.max(...roleLevels.map(r => ROLES[r]));
        await checkPermissionLevel(req, requiredPermission);
      }

      return next();
    } 
    catch (err) {
      return next(err);
    }
  };
}

async function checkAccountAccess(req: Request): Promise<void> {
  if (!req.session.account) {
    throwError("Unauthorized", 401, "User not logged in");
  }

  const account = await prisma.account.findUnique({
    where: { accountId: req.session.account.accountId }
  });

  if (!account) {
    delete req.session.account;
    throwError(
      "Unauthorized",
      401,
      "Account not found. You have been logged out"
    );
  }
}

async function checkClassAccess(req: Request, res: Response): Promise<void> {
  if (!req.session.classId) {
    return res.redirect(302, "/join");
  }

  const aClass = await prisma.class.findUnique({
    where: { classId: parseInt(req.session.classId, 10) }
  });

  if (!aClass) {
    delete req.session.classId;
    throwError(
      "Not Found",
      404,
      "The selected class no longer exists. Please select another class"
    );
  }
}

async function checkPermissionLevel(
  req: Request,
  requiredPermission: number
): Promise<void> {
  let effectivePermission = 0;

  if (req.session.account) {
    const account = await prisma.joinedClass.findUnique({
      where: { accountId: req.session.account.accountId },
      select: { permissionLevel: true }
    });
    effectivePermission = account?.permissionLevel ?? 0;
  } 
  else if (req.session.classId) {
    const aClass = await prisma.class.findUnique({
      where: { classId: parseInt(req.session.classId, 10) },
      select: { defaultPermissionLevel: true }
    });
    effectivePermission = aClass?.defaultPermissionLevel ?? 0;
  }

  if (effectivePermission < requiredPermission) {
    throwError(
      "Forbidden",
      403,
      "The permission level is not sufficient to perform this action"
    );
  }
}

function throwError(name: string, status: number, message: string): never {
  const err: RequestError = { name, status, message, expected: true };
  throw err;
}
