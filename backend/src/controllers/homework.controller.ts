import { Request, Response, NextFunction } from "express";
import homeworkService from "../services/homework.service.js";

export const addHomework = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await homeworkService.addHomework(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export const editHomework = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    await homeworkService.editHomework({ id: Number(req.params.id) }, req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export const deleteHomework = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    await homeworkService.deleteHomework({ id: Number(req.params.id) }, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};


export const checkHomework = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    await homeworkService.checkHomework({ id: Number(req.params.id) }, req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export const pinHomework = async (req: Request<{ id: string }>, res: Response, next: NextFunction): Promise<void> => {
  try {
    await homeworkService.pinHomework({ id: Number(req.params.id) }, req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export const getHomeworkData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const homeworkData = await homeworkService.getHomeworkData(req.session);
    res.status(200).json(homeworkData);
  }
  catch (error) {
    next(error);
  }
};

export const getHomeworkCheckedData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const homeworkCheckedData = await homeworkService.getHomeworkCheckedData(req.session);
    res.status(200).json(homeworkCheckedData);
  }
  catch (error) {
    next(error);
  }
};

export default {
  addHomework,
  editHomework,
  deleteHomework,
  checkHomework,
  pinHomework,
  getHomeworkData,
  getHomeworkCheckedData
};
