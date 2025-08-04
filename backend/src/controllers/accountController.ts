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

export const changeUsername = asyncHandler(async (req, res, next) => {
  const changeUsernameSchema = z.object({
    username: z.string()
  });
  const parseResult = changeUsernameSchema.safeParse(req.body);
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
    await accountService.changeUsername(parseResult.data.username, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export const changePassword = asyncHandler(async (req, res, next) => {
  const changeUsernameSchema = z.object({
    oldPassword: z.string(),
    newPassword: z.string()
  });
  const parseResult = changeUsernameSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Invalid request format",
      expectedFormat: {
        type: "object",
        properties: {
          oldPassword: { type: "string" },
          newPassword: { type: "string" }
        },
        required: ["oldPassword", "newPassword"]
      }
    });
    return;
  }
  try {
    await accountService.changePassword(parseResult.data, req.session);
    res.sendStatus(200);
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
  loginAccount,
  logoutAccount,
  deleteAccount,
  getAuth,
  checkUsername,
  changeUsername,
  changePassword
};
