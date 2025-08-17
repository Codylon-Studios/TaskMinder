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
  try {
    const classsCode = await classService.createClass(req.body, req.session);
    res.status(200).json(classsCode);
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
  try {
    const className = await classService.joinClass(req.body, req.session);
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
  try {
    await classService.changeDefaultPermission(req.body, req.session);
    res.sendStatus(200);
  } 
  catch (error) {
    next(error);
  }
});

// for registered users
export const setClassMembersPermissions = asyncHandler(
  async (req, res, next) => {
    try {
      await classService.setClassMembersPermissions(req.body, req.session);
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
  try {
    await classService.kickClassMember(req.body, req.session);
    res.sendStatus(200);
  } 
  catch (error) {
    next(error);
  }
});

export const updateDSBMobileData = asyncHandler(async (req, res, next) => {
  try {
    await classService.updateDSBMobileData(req.body, req.session);
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
  try {
    await classService.setUsersLoggedOutRole(req.body, req.session);
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
