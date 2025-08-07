import express from "express";
import lessonController from "../controllers/lessonController";
import checkAccess from "../middleware/accessMiddleware";

const router = express.Router();

router.get("/get_lesson_data", checkAccess(["CLASS"]), lessonController.getLessonData);
router.post("/set_lesson_data", checkAccess(["CLASS", "MANAGER"]), lessonController.setLessonData);

export default router;
