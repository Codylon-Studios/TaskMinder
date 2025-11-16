import express from "express";
import subjectController from "../controllers/subject.controller";
import checkAccess from "../middleware/access.middleware";
import { validate } from "../middleware/validation.middleware";
import { setSubjectsSchema } from "../schemas/subject.schema";

const router = express.Router();

router.get("/get_subject_data", checkAccess(["CLASS"]), subjectController.getSubjectData);
router.post("/set_subject_data", checkAccess(["CLASS", "MANAGER"]), validate(setSubjectsSchema), subjectController.setSubjectData);

export default router;
