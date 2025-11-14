import express from "express";
import lessonController from "../controllers/lesson.controller";
import checkAccess from "../middleware/access.middleware";
import { validate } from "../middleware/validation.middleware";
import { setLessonDataSchema } from "../schemas/lesson.schema";

const router = express.Router();

router.get("/get_lesson_data", checkAccess(["CLASS"]), lessonController.getLessonData);
router.post("/set_lesson_data", checkAccess(["CLASS", "MANAGER"]), validate(setLessonDataSchema), lessonController.setLessonData);

export default router;
