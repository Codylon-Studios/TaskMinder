import express from "express";
import rateLimit from "express-rate-limit";
import lessonController from "../controllers/lesson.controller.js";
import checkAccess from "../middleware/access.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { setLessonDataSchema } from "../schemas/lesson.schema.js";

// lesson rate limiters
const readLessonLimiter = rateLimit({ windowMs: 1000, limit: 30 });
const writeLessonLimiter = rateLimit({ windowMs: 1000, limit: 10 });

const router = express.Router();

router.get("/", readLessonLimiter, checkAccess(["CLASS"]), lessonController.getLessons);
router.put("/", writeLessonLimiter, checkAccess(["CLASS", "MANAGER"]), validate(setLessonDataSchema), lessonController.setLessons);

export default router;
