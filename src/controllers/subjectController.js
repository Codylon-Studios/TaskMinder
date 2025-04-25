const subjectService = require("../services/subjectService");
const asyncHandler = require("express-async-handler");

exports.subjectController = {
  getSubjectData: asyncHandler(async(req, res, next) => {
    try {
      const timetableData = await subjectService.getSubjectData();
      res.status(200).json(timetableData);
    } catch (error) {
      next(error);
    }
  }),
  setSubjectData: asyncHandler(async(req, res, next) => {
    const { subjects } = req.body;
    try {
      await subjectService.setSubjectData(subjects);
      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  })
}
