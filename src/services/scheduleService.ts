const scheduleService = {
  async getSubjectData() {
    return require("../subjects.json");
  },

  async getTimetableData() {
    return require("../timetable.json");
  },
};

export default scheduleService;
