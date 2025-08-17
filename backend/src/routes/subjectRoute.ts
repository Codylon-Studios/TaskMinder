import express from "express";
import subjectController from "../controllers/subjectController";
import checkAccess from "../middleware/accessMiddleware";
import { validate } from "../middleware/validationMiddleware";
import { setSubjectsSchema } from "../schemas/subjectSchema";

const router = express.Router();

router.get("/get_subject_data", checkAccess(["CLASS"]), subjectController.getSubjectData);
router.post("/set_subject_data", checkAccess(["CLASS", "MANAGER"]), validate(setSubjectsSchema), subjectController.setSubjectData);

export default router;
