import subjectService from "../services/subjectService";
import asyncHandler from "express-async-handler";

export const getSubjectData = asyncHandler(async (req, res, next) => {
  try {
    const timetableData = await subjectService.getSubjectData(req.session);
    res.status(200).json(timetableData);
  }
  catch (error) {
    next(error);
  }
});
export const setSubjectData = asyncHandler(async (req, res, next) => {
  try {
    await subjectService.setSubjectData(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export default {
  getSubjectData,
  setSubjectData
};
