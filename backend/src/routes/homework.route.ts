import express from "express";
import rateLimit from "express-rate-limit";
import homeworkController from "../controllers/homework.controller";
import checkAccess from "../middleware/access.middleware";
import { addHomeworkSchema, checkHomeworkSchema, deleteHomeworkSchema, editHomeworkSchema } from "../schemas/homework.schema";
import { validate } from "../middleware/validation.middleware";

// rate limiter
const homeworkLimiter = rateLimit({
  windowMs: 1000, // 1 second
  limit: 15, // Max 15 requests per IP per second
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { status: 429, message: "Too many requests, please slow down." }
});

const router = express.Router();

router.post("/add_homework", homeworkLimiter, checkAccess(["CLASS", "EDITOR"]), validate(addHomeworkSchema), homeworkController.addHomework);
router.post("/check_homework", homeworkLimiter, checkAccess(["CLASS", "ACCOUNT"]), validate(checkHomeworkSchema), homeworkController.checkHomework);
router.post("/delete_homework", homeworkLimiter, checkAccess(["CLASS", "EDITOR"]), validate(deleteHomeworkSchema), homeworkController.deleteHomework);
router.post("/edit_homework", homeworkLimiter, checkAccess(["CLASS", "EDITOR"]), validate(editHomeworkSchema), homeworkController.editHomework);
router.get("/get_homework_data", homeworkLimiter, checkAccess(["CLASS"]), homeworkController.getHomeworkData);
router.get("/get_homework_checked_data", homeworkLimiter, checkAccess(["CLASS", "ACCOUNT"]), homeworkController.getHomeworkCheckedData);

export default router;
