import express from "express";
import scheduleController from "../controllers/scheduleController";
import checkAccess from "../middleware/accessMiddleware";

const router = express.Router();

router.get("/get_timetable_data", checkAccess.elseUnauthorized, scheduleController.getTimetableData);
router.get("/get_subject_data", checkAccess.elseUnauthorized, scheduleController.getSubjectData);

export default router;
