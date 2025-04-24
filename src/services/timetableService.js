const fs = require('fs').promises;
const { validateTimetableJSON } = require('../validators/timetableValidator');
const Timetable = require('../models/timetable');

const timetableService = {
  async setTimetableData(filePath, classId) {
    try {
      const fileData = await fs.readFile(filePath, 'utf8');
      const jsonData = JSON.parse(fileData);
      const validation = validateTimetableJSON(jsonData);
      if (!validation.valid) {
        const error = new Error('Invalid timetable JSON format');
        error.statusCode = 400;
        error.details = validation.errors;
        throw error;
      }

      const timetable = await Timetable.findOne({ where: { class: classId } });

      if (timetable) {
        timetable.content = jsonData;
        timetable.lastUpdated = Date.now();
        await timetable.save();
        return timetable;
      } else {
        return await Timetable.create({
          class: classId,
          content: jsonData,
          lastUpdated: Date.now()
        });
      }
    } catch (error) {
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
      throw error;
    } finally {
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
  },

  async getTimetableData(classId) {
    return await Timetable.findOne({ where: { class: classId } });
  }
}

module.exports = timetableService;