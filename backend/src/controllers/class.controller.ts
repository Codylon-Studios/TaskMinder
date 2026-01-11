import { Request, Response, NextFunction } from "express";
import classService from "../services/class.service";

export const getClassInfo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const classInfo = await classService.getClassInfo(req.session);
    res.status(200).json(classInfo);
  }
  catch (error) {
    next(error);
  }
};

export const createClass = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const classsCode = await classService.createClass(req.body, req.session);
    res.status(200).json(classsCode);
  }
  catch (error) {
    next(error);
  }
};

export const joinClass = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const className = await classService.joinClass(req.body, req.session);
    res.status(200).json(className);
  }
  catch (error) {
    next(error);
  }
};

export const leaveClass = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await classService.leaveClass(req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export const deleteClass = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await classService.deleteClass(req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export const changeDefaultPermission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await classService.changeDefaultPermission(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export const setClassMembersPermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await classService.setClassMembersPermissions(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export const getClassMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const classMembers = await classService.getClassMembers(req.session);
    res.status(200).json(classMembers);
  }
  catch (error) {
    next(error);
  }
};

export const kickClassMembers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await classService.kickClassMember(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export const updateDSBMobileData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await classService.updateDSBMobileData(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export const getUsersLoggedOutRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const usersLoggedOutRole = await classService.getUsersLoggedOutRole(req.session);
    res.status(200).json(usersLoggedOutRole);
  }
  catch (error) {
    next(error);
  }
};

export const kickLoggedOutUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await classService.kickLoggedOutUsers(req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export const changeClassName = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await classService.changeClassName(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export const changeClassCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const code = await classService.changeClassCode(req.session);
    res.status(200).json(code);
  }
  catch (error) {
    next(error);
  }
};

export const upgradeTestClass = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await classService.upgradeTestClass(req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export default {
  getClassInfo,
  createClass,
  joinClass,
  leaveClass,
  deleteClass,
  changeDefaultPermission,
  getClassMembers,
  setClassMembersPermissions,
  kickClassMembers,
  updateDSBMobileData,
  getUsersLoggedOutRole,
  kickLoggedOutUsers,
  changeClassName,
  changeClassCode,
  upgradeTestClass
};
