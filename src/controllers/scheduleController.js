const scheduleService = require('../services/scheduleService');
const asyncHandler = require('express-async-handler');

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
    setTimetableData: asyncHandler(async (req, res, next) => {
        try {
          const content = fs.readFileSync(req.file.path, 'utf-8');
          fs.unlinkSync(req.file.path);
          let parsed;
          try {
            parsed = JSON.parse(content);
          } catch (err) {
            return res.status(400).json({ message: 'Invalid JSON format in uploaded file' });
          }
          const schoolId = '0187'
          const result = await scheduleService.setTimetableData(parsed, schoolId);
          res.status(201).json({ message: 'Timetable uploaded', ...result });
        } catch (error) {
          next(error);
        }
      }),
    setSubjectData: asyncHandler(async(req, res, next) => {
        try {
            const subjectData = await scheduleService.getSubjectData();
            res.status(200).json(subjectData);
        } catch (error) {
            next(error);
        }
    })
}