import { Request, Response, NextFunction } from "express";
import lessonService from "../services/lesson.service";

export const getLessonData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const lessonData = await lessonService.getLessonData(req.session);
    res.status(200).json(lessonData);
  }
  catch (error) {
    next(error);
  }
};

export const setLessonData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await lessonService.setLessonData(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export default {
  getLessonData,
  setLessonData
};
