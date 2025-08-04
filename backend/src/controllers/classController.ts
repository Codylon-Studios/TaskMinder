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
// TODO @Mingqi: merge createTestClass and createClass
export const createTestClass = asyncHandler(async (req, res, next) => {
  const createTestClassSchema = z.object({
    classDisplayName: z.string()
  });
  const parseResult = createTestClassSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Invalid request format",
      expectedFormat: {
        type: "object",
        properties: {
          classDisplayName: { type: "string" }
        },
        required: ["classDisplayName"]
      }
    });
    return;
  }
  try {
    await classService.createTestClass(parseResult.data, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export const createClass = asyncHandler(async (req, res, next) => {
  const createClassSchema = z.object({
    classDisplayName: z.string()
  });
  const parseResult = createClassSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Invalid request format",
      expectedFormat: {
        type: "object",
        properties: {
          classDisplayName: { type: "string" }
        },
        required: ["classDisplayName"]
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
    res.sendStatus(200).json(classCode);
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
    await classService.joinClass(parseResult.data.classCode, req.session);
    res.sendStatus(200);
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
export const setClassMembersPermissions = asyncHandler(async (req, res, next) => {
  const setClassMembersPermissionsSchema = z.object({
    members: z.array(
      z.object({
        accountId: z.coerce.number(),
        permissionLevel: z.coerce.number()
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
          members: {
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
    await classService.setClassMembersPermissions(parseResult.data.members);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

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
    accountId: z.coerce.number()
  });
  const parseResult = kickClassMembersSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Invalid request format",
      expectedFormat: {
        type: "object",
        properties: {
          accountId: { type: "number" }
        },
        required: ["accountId"]
      }
    });
    return;
  }
  try {
    await classService.kickClassMember(parseResult.data);
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

export default {
  getClassInfo,
  createTestClass,
  createClass,
  generateClassCode,
  joinClass,
  leaveClass,
  deleteClass,
  changeDefaultPermission,
  getClassMembers,
  setClassMembersPermissions,
  kickClassMembers,
  updateDSBMobileData
};
