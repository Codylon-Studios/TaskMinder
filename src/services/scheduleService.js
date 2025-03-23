const subjects = require("../subjects.json");
const timetable = require("../timetable.json");

const scheduleService = {
    async getSubjectData() {
        return subjects;
    },
    
    async getTimetableData() {
        return timetable;
    }
};

module.exports = scheduleService;
