import express from "express";
import homeworkController from "../controllers/homeworkController";
import checkAccess from "../middleware/accessMiddleware";

const router = express.Router();

router.post("/add_homework", checkAccess.checkAccountAndClass, checkAccess.checkPermissionLevel(1), homeworkController.addHomework);
router.post("/check_homework", checkAccess.checkAccountAndClass, homeworkController.checkHomework);
router.post("/delete_homework", checkAccess.checkAccountAndClass, checkAccess.checkPermissionLevel(1), homeworkController.deleteHomework);
router.post("/edit_homework", checkAccess.checkAccountAndClass, checkAccess.checkPermissionLevel(1), homeworkController.editHomework);
router.get("/get_homework_data", checkAccess.checkClass, homeworkController.getHomeworkData);
router.get("/get_homework_checked_data", checkAccess.checkAccountAndClass, homeworkController.getHomeworkCheckedData);

export default router;
