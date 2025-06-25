import express from "express";
import classController from "../controllers/classController";
import checkAccess from "../middleware/accessMiddleware";

const router = express.Router();

router.get("/get_classinfo", checkAccess.elseUnauthorized, classController.getClassInfo);
router.post("/create_test_class", checkAccess.elseUnauthorized, classController.createTestClass);
router.get("/generate_new_class_code", checkAccess.elseUnauthorized, classController.generateNewClassCode);
router.post("/create_class", checkAccess.elseUnauthorized, classController.createClass);
router.post("/leave_class", checkAccess.elseUnauthorized, classController.leaveClass);
router.post("/delete_class", checkAccess.elseUnauthorized, classController.deleteClass);
router.post("/update_dsb_mobile_data", checkAccess.elseUnauthorized, classController.updateDSBMobileData);

export default router;
