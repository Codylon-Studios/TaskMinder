import { Request, Response, NextFunction } from "express";
import classService from "../services/class.service.js";

export const getClassInfo = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const classInfo = await classService.getClassInfo({ id: Number(req.params.id) }, req.session);
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

export const leaveClass = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    await classService.leaveClass({ id: Number(req.params.id) }, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export const deleteClass = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    await classService.deleteClass({ id: Number(req.params.id) }, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export const changeDefaultPermission = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    await classService.changeDefaultPermission({ id: Number(req.params.id) }, req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export const setClassMembersPermissions = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    await classService.setClassMembersPermissions({ id: Number(req.params.id) }, req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export const getClassMembers = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const classMembers = await classService.getClassMembers({ id: Number(req.params.id) }, req.session);
    res.status(200).json(classMembers);
  }
  catch (error) {
    next(error);
  }
};

export const kickClassMembers = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    await classService.kickClassMember({ id: Number(req.params.id) }, req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export const kickLoggedOutUsers = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    await classService.kickLoggedOutUsers({ id: Number(req.params.id) }, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export const changeClassName = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    await classService.changeClassName({ id: Number(req.params.id) }, req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export const changeClassCode = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const code = await classService.changeClassCode({ id: Number(req.params.id) }, req.session);
    res.status(200).json(code);
  }
  catch (error) {
    next(error);
  }
};

export const upgradeTestClass = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    await classService.upgradeTestClass({ id: Number(req.params.id) }, req.session);
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
  kickLoggedOutUsers,
  changeClassName,
  changeClassCode,
  upgradeTestClass
};
