import accountService from "../services/account.service";
import asyncHandler from "express-async-handler";

export const registerAccount = asyncHandler(async (req, res, next) => {
  try {
    await accountService.registerAccount(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export const loginAccount = asyncHandler(async (req, res, next) => {
  try {
    await accountService.loginAccount(req.body, req.session);
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
  try {
    await accountService.deleteAccount(req.body, req.session);
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
  try {
    await accountService.changeUsername(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export const changePassword = asyncHandler(async (req, res, next) => {
  try {
    await accountService.changePassword(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export const checkUsername = asyncHandler(async (req, res, next) => {
  try {
    const response = await accountService.checkUsername(req.body);
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
