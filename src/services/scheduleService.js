const fs = require('fs');
const path = require('path');
const Timetable = require('../models/timetable');
const { validateTimetableJSON } = require('../validators/timetableValidator');

const scheduleService = {
  async getSubjectData() {
    return require('../subjects.json');
  },

  async getTimetableData() {
    return require('../timetable.json');
  },

  async setSubjectData(data) {
    const subjectsPath = path.join(__dirname, '../subjects.json');
    fs.writeFileSync(subjectsPath, JSON.stringify(data, null, 2));
    return data;
  },

  async setTimetableData(data, schoolId) {
    const { valid, errors } = validateTimetableJSON(data);
    if (!valid) {
      throw new Error(`Validation failed: ${JSON.stringify(errors, null, 2)}`);
    }
    const now = Date.now();
    const [record, created] = await Timetable.upsert({
      school: schoolId,
      content: data,
      lastUpdated: now
    }, {
      returning: true
    });

    return {
      message: created ? 'Timetable created' : 'Timetable updated',
      lastUpdated: now
    };
  }
};

module.exports = scheduleService;