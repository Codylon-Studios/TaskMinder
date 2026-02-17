import express from "express";
import rateLimit from "express-rate-limit";
import subjectController from "../controllers/subject.controller";
import checkAccess from "../middleware/access.middleware";
import { validate } from "../middleware/validation.middleware";
import { setSubjectsSchema } from "../schemas/subject.schema";

// subject rate limiters
const readSubjectLimiter = rateLimit({ windowMs: 1000, limit: 30 });
const writeSubjectLimiter = rateLimit({ windowMs: 1000, limit: 10 });

const router = express.Router();

router.get("/", readSubjectLimiter, checkAccess(["CLASS"]), subjectController.getSubjects);
router.put("/", writeSubjectLimiter, checkAccess(["CLASS", "MANAGER"]), validate(setSubjectsSchema), subjectController.setSubjects);

export default router;
