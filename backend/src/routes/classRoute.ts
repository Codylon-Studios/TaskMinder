import express from "express";
import classController from "../controllers/classController";
import checkAccess from "../middleware/accessMiddleware";

const router = express.Router();

router.get("/get_classinfo", checkAccess.checkClass, classController.getClassInfo);
router.post("/create_test_class", checkAccess.checkAccount, classController.createTestClass);
router.get("/generate_new_class_code", checkAccess.checkAccount, classController.generateNewClassCode);
router.post("/create_class", checkAccess.checkAccount, classController.createClass);
router.post("/leave_class", checkAccess.checkClass, classController.leaveClass);
router.post("/delete_class", checkAccess.checkAccountAndClass, checkAccess.checkPermissionLevel(3), classController.deleteClass);
// eslint-disable-next-line max-len
router.post("/change_default_permission", checkAccess.checkAccountAndClass, checkAccess.checkPermissionLevel(3), classController.changeDefaultPermission);
// eslint-disable-next-line max-len
router.post("/set_class_members_permission", checkAccess.checkAccountAndClass, checkAccess.checkPermissionLevel(3), classController.setClassMembersPermissions);
router.post("kick_class_members", checkAccess.checkAccountAndClass, checkAccess.checkPermissionLevel(3), classController.kickClassMembers);
router.get("/get_class_members", checkAccess.checkAccountAndClass, checkAccess.checkPermissionLevel(3), classController.getClassMembers);
router.post("/update_dsb_mobile_data", checkAccess.checkAccountAndClass, checkAccess.checkPermissionLevel(2), classController.updateDSBMobileData);

export default router;
