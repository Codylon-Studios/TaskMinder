import express from "express";
import subjectController from "../controllers/subjectController";
import checkAccess from "../middleware/accessMiddleware";

const router = express.Router();

router.get("/get_subject_data", checkAccess(["CLASS"]), subjectController.getSubjectData);
router.post("/set_subject_data", checkAccess(["CLASS", "MANAGER"]), subjectController.setSubjectData);

export default router;
