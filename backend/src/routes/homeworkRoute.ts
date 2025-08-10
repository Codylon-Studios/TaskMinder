import express from "express";
import homeworkController from "../controllers/homeworkController";
import checkAccess from "../middleware/accessMiddleware";
import { addHomeworkSchema, checkHomeworkSchema, deleteHomeworkSchema, editHomeworkSchema } from "../schemas/homeworkSchema";
import { validate } from "../middleware/validationMiddleware";

const router = express.Router();

router.post("/add_homework", checkAccess(["CLASS", "EDITOR"]), validate(addHomeworkSchema), homeworkController.addHomework);
router.post("/check_homework", checkAccess(["CLASS", "ACCOUNT"]), validate(checkHomeworkSchema), homeworkController.checkHomework);
router.post("/delete_homework", checkAccess(["CLASS", "EDITOR"]), validate(deleteHomeworkSchema), homeworkController.deleteHomework);
router.post("/edit_homework", checkAccess(["CLASS", "EDITOR"]), validate(editHomeworkSchema), homeworkController.editHomework);
router.get("/get_homework_data", checkAccess(["CLASS"]), homeworkController.getHomeworkData);
router.get("/get_homework_checked_data", checkAccess(["CLASS", "ACCOUNT"]), homeworkController.getHomeworkCheckedData);

export default router;
