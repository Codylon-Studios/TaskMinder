const timetableService = require('../services/timetableService');
const asyncHandler = require('express-async-handler');

exports.timetableController = {
  getTimetableData: asyncHandler(async (req, res, next) => {
    try {
      /*
    const classId = parseInt(req.params.classId);
    if (!classId || isNaN(classId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Valid class ID is required'
      });
    }
    */
    
    const classId = 1234;

    const timetable = await timetableService.getTimetableData(classId);

    if (!timetable) {
      return res.status(404).json({
        status: 'error',
        message: `Timetable not found for class ID: ${classId}`
      });
    }
    res.status(200).json(timetable);
    } catch (error) {
      next(error);
    }
  }),
  setTimetableData: asyncHandler(async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: 'No file uploaded'
        });
      }

      /*
      const classId = parseInt(req.body.classId);
      if (!classId || isNaN(classId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Valid class ID is required'
        });
      }
      */

      const classId = 1234;

      const timetable = await timetableService.setTimetableData(req.file.path, classId);

      res.status(200).json({
        status: 'success',
        message: 'Timetable uploaded successfully',
        data: {
          timetableId: timetable.timetableId,
          class: timetable.class,
          lastUpdated: timetable.lastUpdated
        }
      });
    } catch (error) {
      next(error);
    }
  })
}