const fs = require("fs").promises;
import { validateTimetableJSON } from "../utils/timetableValidator";
import { RequestError } from "../@types/requestError";
import Timetable from "../models/timetableModel";

const timetableService = {
  async setTimetableData(filePath: string, classId: number) {
    try {
      const fileData = await fs.readFile(filePath, "utf8");
      const jsonData = JSON.parse(fileData);
      const validation = validateTimetableJSON(jsonData);
      if (!validation.valid) {
        let err: RequestError = {
          name: "Bad Request",
          status: 400,
          message: "Invalid data format",
          expected: true,
        }
        throw err;
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
        console.error("Error deleting file:", unlinkError);
      }
      throw error;
    } finally {
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        console.error("Error deleting file:", unlinkError);
      }
    }
  },

  async getTimetableData(classId: number) {
    return await Timetable.findOne({ where: { class: classId } });
  }
}

export default timetableService;
