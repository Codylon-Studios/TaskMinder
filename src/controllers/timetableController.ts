import timetableService from "../services/timetableService";
import asyncHandler from "express-async-handler";

export const getTimetableData = asyncHandler(async (req, res, next) => {
  try {
    const classId = 1234;

    const timetable = await timetableService.getTimetableData(classId);

    if (!timetable) {
      res.status(404).json({
        error: `Timetable not found for class ID: ${classId}`
      });
      return
    }
    res.status(200).json(timetable);
  } catch (error) {
    next(error);
  }
})
export const setTimetableData = asyncHandler(async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({
        error: "Invalid request format (No file uploaded)"
      });
      return
    }

    const classId = 1234;

    await timetableService.setTimetableData(req.file.path, classId);

    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
})

export default {
  getTimetableData,
  setTimetableData
};
