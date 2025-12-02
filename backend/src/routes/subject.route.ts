import express from "express";
import rateLimit from "express-rate-limit";
import subjectController from "../controllers/subject.controller";
import checkAccess from "../middleware/access.middleware";
import { validate } from "../middleware/validation.middleware";
import { setSubjectsSchema } from "../schemas/subject.schema";

// rate limiter
const subjectLimiter = rateLimit({
  windowMs: 1000, // 1 second
  limit: 15, // Max 15 requests per IP per second
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { status: 429, message: "Too many requests, please slow down." }
});

const router = express.Router();

router.get("/get_subject_data", subjectLimiter, checkAccess(["CLASS"]), subjectController.getSubjectData);
router.post("/set_subject_data", subjectLimiter, checkAccess(["CLASS", "MANAGER"]), validate(setSubjectsSchema), subjectController.setSubjectData);

export default router;
