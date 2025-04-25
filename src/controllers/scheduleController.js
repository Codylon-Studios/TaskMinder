const scheduleService = require("../services/scheduleService");
const asyncHandler = require("express-async-handler");

exports.scheduleController = {
  getTimetableData: asyncHandler(async(req, res, next) => {
    try {
      const timetableData = await scheduleService.getTimetableData();
      res.status(200).json(timetableData);
    } catch (error) {
      next(error);
    }
  }),
  getSubjectData: asyncHandler(async(req, res, next) => {
    try {
      const subjectData = await scheduleService.getSubjectData();
      res.status(200).json(subjectData);
    } catch (error) {
      next(error);
    }
  }),
}
