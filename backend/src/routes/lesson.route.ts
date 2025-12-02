import express from "express";
import rateLimit from "express-rate-limit";
import lessonController from "../controllers/lesson.controller";
import checkAccess from "../middleware/access.middleware";
import { validate } from "../middleware/validation.middleware";
import { setLessonDataSchema } from "../schemas/lesson.schema";

// rate limiter
const lessonLimiter = rateLimit({
  windowMs: 1000, // 1 second
  limit: 15, // Max 15 requests per IP per second
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { status: 429, message: "Too many requests, please slow down." }
});

const router = express.Router();

router.get("/get_lesson_data", lessonLimiter, checkAccess(["CLASS"]), lessonController.getLessonData);
router.post("/set_lesson_data", lessonLimiter, checkAccess(["CLASS", "MANAGER"]), validate(setLessonDataSchema), lessonController.setLessonData);

export default router;
