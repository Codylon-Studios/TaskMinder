import express from "express";
import timetableController from "../controllers/timetableController";
import { upload } from "../middleware/fileUploadMiddleware";
import checkAccess from "../middleware/accessMiddleware";

const router = express.Router();

router.get("/get_timetable_data", checkAccess.elseUnauthorized, timetableController.getTimetableData);
router.post("/set_timetable_data", checkAccess.elseUnauthorized, upload.single("timetable"), timetableController.setTimetableData);

export default router;
