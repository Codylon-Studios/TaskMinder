import { Request, Response, NextFunction } from "express";
import subjectService from "../services/subject.service";

export const getSubjects = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const timetableData = await subjectService.getSubjectData(req.session);
    res.status(200).json(timetableData);
  }
  catch (error) {
    next(error);
  }
};

export const setSubjects = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await subjectService.setSubjectData(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export default {
  getSubjects,
  setSubjects
};
