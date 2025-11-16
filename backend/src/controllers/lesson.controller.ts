import lessonService from "../services/lesson.service";
import asyncHandler from "express-async-handler";

export const getLessonData = asyncHandler(async (req, res, next) => {
  try {
    const lessonData = await lessonService.getLessonData(req.session);
    res.status(200).json(lessonData);
  }
  catch (error) {
    next(error);
  }
});
export const setLessonData = asyncHandler(async (req, res, next) => {
  try {
    await lessonService.setLessonData(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export default {
  getLessonData,
  setLessonData
};
