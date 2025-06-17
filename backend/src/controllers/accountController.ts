import accountService from "../services/accountService";
import asyncHandler from "express-async-handler";
import { z } from "zod";

export const registerAccount = asyncHandler(async (req, res, next) => {
  const registerAccountSchema = z.object({
    username: z.string(),
    password: z.string()
  });
  const parseResult = registerAccountSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Invalid request format",
      expectedFormat: {
        type: "object",
        properties: {
          username: { type: "string", pattern: "/^\\w{4,20}$/" },
          password: { type: "string" }
        },
        required: ["username", "password"]
      }
    });
    return;
  }
  try {
    await accountService.registerAccount(parseResult.data, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export const joinClass = asyncHandler(async (req, res, next) => {
  const joinClassSchema = z.object({
    classcode: z.string()
  });
  const parseResult = joinClassSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Invalid request format",
      expectedFormat: {
        type: "object",
        properties: {
          classcode: { type: "string" }
        },
        required: ["classcode"]
      }
    });
    return;
  }
  try {
    await accountService.joinClass(parseResult.data.classcode, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export const loginAccount = asyncHandler(async (req, res, next) => {
  const loginAccountSchema = z.object({
    username: z.string(),
    password: z.string()
  });
  const parseResult = loginAccountSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Invalid request format",
      expectedFormat: {
        type: "object",
        properties: {
          username: { type: "string", pattern: "/^\\w{4,20}$/" },
          password: { type: "string" }
        },
        required: ["username", "password"]
      }
    });
    return;
  }
  try {
    await accountService.loginAccount(parseResult.data, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export const logoutAccount = asyncHandler(async (req, res, next) => {
  try {
    await accountService.logoutAccount(req.session);
    res.clearCookie("UserLogin");
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export const deleteAccount = asyncHandler(async (req, res, next) => {
  const deleteAccountSchema = z.object({
    password: z.string()
  });
  const parseResult = deleteAccountSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Invalid request format",
      expectedFormat: {
        type: "object",
        properties: {
          password: { type: "string" }
        },
        required: ["password"]
      }
    });
    return;
  }
  try {
    await accountService.deleteAccount(parseResult.data.password, req.session);
    res.clearCookie("UserLogin");
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export const getAuth = asyncHandler(async (req, res, next) => {
  try {
    const response = await accountService.getAuth(req.session);
    res.status(200).json(response);
  }
  catch (error) {
    next(error);
  }
});

export const checkUsername = asyncHandler(async (req, res, next) => {
  const checkUsernameSchema = z.object({
    username: z.string()
  });
  const parseResult = checkUsernameSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Invalid request format",
      expectedFormat: {
        type: "object",
        properties: {
          username: { type: "string", pattern: "/^\\w{4,20}$/" }
        },
        required: ["username"]
      }
    });
    return;
  }
  try {
    const response = await accountService.checkUsername(parseResult.data.username);
    res.status(200).json(response);
  }
  catch (error) {
    next(error);
  }
});

export default {
  registerAccount,
  joinClass,
  loginAccount,
  logoutAccount,
  deleteAccount,
  getAuth,
  checkUsername
};
