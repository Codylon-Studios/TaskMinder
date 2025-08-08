import z from "zod";
import classService from "../services/classService";
import asyncHandler from "express-async-handler";

export const getClassInfo = asyncHandler(async (req, res, next) => {
  try {
    const classInfo = await classService.getClassInfo(req.session);
    res.status(200).json(classInfo);
  } 
  catch (error) {
    next(error);
  }
});

export const createClass = asyncHandler(async (req, res, next) => {
  const createClassSchema = z.object({
    classDisplayName: z.string(),
    isTestClass: z.boolean()
  });
  const parseResult = createClassSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Invalid request format",
      expectedFormat: {
        type: "object",
        properties: {
          classDisplayName: { type: "string" },
          isTestClass: { type: "boolean" }
        },
        required: ["classDisplayName", "isTestClass"]
      }
    });
    return;
  }
  try {
    await classService.createClass(parseResult.data, req.session);
    res.sendStatus(200);
  } 
  catch (error) {
    next(error);
  }
});

export const generateClassCode = asyncHandler(async (req, res, next) => {
  try {
    const classCode = await classService.generateClassCode(req.session);
    res.status(200).json(classCode);
  } 
  catch (error) {
    next(error);
  }
});

export const joinClass = asyncHandler(async (req, res, next) => {
  const joinClassSchema = z.object({
    classCode: z.string()
  });
  const parseResult = joinClassSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Invalid request format",
      expectedFormat: {
        type: "object",
        properties: {
          classCode: { type: "string" }
        },
        required: ["classCode"]
      }
    });
    return;
  }
  try {
    const className = await classService.joinClass(parseResult.data.classCode, req.session);
    res.status(200).json(className);
  } 
  catch (error) {
    next(error);
  }
});

export const leaveClass = asyncHandler(async (req, res, next) => {
  try {
    await classService.leaveClass(req.session);
    res.sendStatus(200);
  } 
  catch (error) {
    next(error);
  }
});

export const deleteClass = asyncHandler(async (req, res, next) => {
  try {
    await classService.deleteClass(req.session);
    res.sendStatus(200);
  } 
  catch (error) {
    next(error);
  }
});

// for unregistered users
export const changeDefaultPermission = asyncHandler(async (req, res, next) => {
  const changeDefaultPermissionSchema = z.object({
    defaultPermission: z.coerce.number()
  });
  const parseResult = changeDefaultPermissionSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Invalid request format",
      expectedFormat: {
        type: "object",
        properties: {
          defaultPermission: { type: "number" }
        },
        required: ["defaultPermission"]
      }
    });
    return;
  }
  try {
    await classService.changeDefaultPermission(parseResult.data, req.session);
    res.sendStatus(200);
  } 
  catch (error) {
    next(error);
  }
});

// for registered users
export const setClassMembersPermissions = asyncHandler(
  async (req, res, next) => {
    const setClassMembersPermissionsSchema = z.object({
      classMembers: z.array(
        z.object({
          accountId: z.number(),
          permissionLevel: z.number()
        })
      )
    });
    const parseResult = setClassMembersPermissionsSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: "Invalid request format",
        expectedFormat: {
          type: "object",
          properties: {
            classMembers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  accountId: { type: "number" },
                  permissionLevel: { type: "number" }
                },
                required: ["accountId", "permissionLevel"]
              }
            }
          },
          required: ["members"]
        }
      });
      return;
    }
    try {
      await classService.setClassMembersPermissions(
        parseResult.data.classMembers
      );
      res.sendStatus(200);
    } 
    catch (error) {
      next(error);
    }
  }
);

export const getClassMembers = asyncHandler(async (req, res, next) => {
  try {
    const classMembers = await classService.getClassMembers(req.session);
    res.status(200).json(classMembers);
  } 
  catch (error) {
    next(error);
  }
});

export const kickClassMembers = asyncHandler(async (req, res, next) => {
  const kickClassMembersSchema = z.object({
    classMembers: z.array(
      z.object({
        accountId: z.coerce.number()
      })
    )
  });
  const parseResult = kickClassMembersSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Invalid request format",
      expectedFormat: {
        type: "object",
        properties: {
          classMembers: {
            type: "array",
            items: {
              type: "object",
              accountId: { type: "number" }
            },
            required: ["accountId"]
          }
        },
        required: ["classMembers"]
      }
    });
    return;
  }
  try {
    await classService.kickClassMember(parseResult.data.classMembers);
    res.sendStatus(200);
  } 
  catch (error) {
    next(error);
  }
});

export const updateDSBMobileData = asyncHandler(async (req, res, next) => {
  const updateDSBMobileDataSchema = z.object({
    dsbMobileActivated: z.boolean(),
    dsbMobileUser: z.string().nullable(),
    dsbMobilePassword: z.string().nullable(),
    dsbMobileClass: z.string().nullable()
  });
  const parseResult = updateDSBMobileDataSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Invalid request format",
      expectedFormat: {
        type: "object",
        properties: {
          dsbMobileActivated: { type: "boolean" }
        },
        required: ["dsbMobileActivated"]
      }
    });
    return;
  }
  try {
    await classService.updateDSBMobileData(parseResult.data, req.session);
    res.sendStatus(200);
  } 
  catch (error) {
    next(error);
  }
});

export const getUsersLoggedOutRole = asyncHandler(async (req, res, next) => {
  try {
    const usersLoggedOutRole = await classService.getUsersLoggedOutRole(req.session);
    res.status(200).json(usersLoggedOutRole);
  } 
  catch (error) {
    next(error);
  }
});

export const setUsersLoggedOutRole = asyncHandler(async (req, res, next) => {
  const setUsersLoggedOutRoleSchema = z.object({
    role: z.coerce.number().int().min(0).max(3)
  });
  const parseResult = setUsersLoggedOutRoleSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Invalid request format",
      expectedFormat: {
        type: "object",
        properties: {
          role: { type: "integer", min: 0, max: 3 }
        },
        required: ["role"]
      }
    });
    return;
  }
  try {
    await classService.setUsersLoggedOutRole(parseResult.data, req.session);
    res.sendStatus(200);
  } 
  catch (error) {
    next(error);
  }
});

export const kickLoggedOutUsers = asyncHandler(async (req, res, next) => {
  try {
    await classService.kickLoggedOutUsers(req.session);
    res.sendStatus(200);
  } 
  catch (error) {
    next(error);
  }
});

export default {
  getClassInfo,
  createClass,
  generateClassCode,
  joinClass,
  leaveClass,
  deleteClass,
  changeDefaultPermission,
  getClassMembers,
  setClassMembersPermissions,
  kickClassMembers,
  updateDSBMobileData,
  getUsersLoggedOutRole,
  setUsersLoggedOutRole,
  kickLoggedOutUsers
};
