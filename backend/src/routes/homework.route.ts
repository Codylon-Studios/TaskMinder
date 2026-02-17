import express from "express";
import rateLimit from "express-rate-limit";
import homeworkController from "../controllers/homework.controller";
import checkAccess from "../middleware/access.middleware";
import { addHomeworkSchema, checkHomeworkSchema, deleteHomeworkSchema, editHomeworkSchema, pinHomeworkSchema } from "../schemas/homework.schema";
import { validate } from "../middleware/validation.middleware";

// homework rate limiters
const readHomeworkLimiter = rateLimit({ windowMs: 1000, limit: 30 });
const writeHomeworkLimiter = rateLimit({ windowMs: 1000, limit: 10 });

const router = express.Router();

router.get("/", readHomeworkLimiter, checkAccess(["CLASS"]), homeworkController.getHomeworkData);
router.get("/checked", readHomeworkLimiter, checkAccess(["CLASS", "ACCOUNT"]), homeworkController.getHomeworkCheckedData);

router.post("/", writeHomeworkLimiter, checkAccess(["CLASS", "EDITOR"]), validate(addHomeworkSchema), homeworkController.addHomework);
router.patch("/:id", writeHomeworkLimiter, checkAccess(["CLASS", "EDITOR"]), validate(editHomeworkSchema), homeworkController.editHomework);
router.delete("/:id", writeHomeworkLimiter, checkAccess(["CLASS", "EDITOR"]), validate(deleteHomeworkSchema), homeworkController.deleteHomework);

router.patch("/:id/check", writeHomeworkLimiter, checkAccess(["CLASS", "ACCOUNT"]), validate(checkHomeworkSchema), homeworkController.checkHomework);
router.patch("/:id/pin", writeHomeworkLimiter, checkAccess(["CLASS", "EDITOR"]), validate(pinHomeworkSchema), homeworkController.pinHomework);

export default router;
