import scheduleService from "../services/scheduleService";
import asyncHandler from "express-async-handler";

export const getTimetableData = asyncHandler(async(req, res, next) => {
  try {
    const timetableData = await scheduleService.getTimetableData();
    res.status(200).json(timetableData);
  } catch (error) {
    next(error);
  }
})
export const getSubjectData = asyncHandler(async(req, res, next) => {
  try {
    const subjectData = await scheduleService.getSubjectData();
    res.status(200).json(subjectData);
  } catch (error) {
    next(error);
  }
})

export default {
  getTimetableData,
  getSubjectData
}
