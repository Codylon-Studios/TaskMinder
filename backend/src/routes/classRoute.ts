import express from "express";
import classController from "../controllers/classController";
import checkAccess from "../middleware/accessMiddleware";

const router = express.Router();

router.get("/get_class_info", checkAccess(["CLASS"]), classController.getClassInfo);
router.get("/generate_class_code", checkAccess(["ACCOUNT"]), classController.generateClassCode);
router.post("/create_class", checkAccess(["ACCOUNT"]), classController.createClass);
router.post("/join", classController.joinClass);
router.post("/leave_class", checkAccess(["CLASS"]), classController.leaveClass);
router.post("/delete_class", checkAccess(["CLASS", "ADMIN"]), classController.deleteClass);
router.post("/change_default_permission", checkAccess(["CLASS", "ADMIN"]), classController.changeDefaultPermission);
router.post("/set_class_members_permission", checkAccess(["CLASS", "ADMIN"]), classController.setClassMembersPermissions);
router.post("/kick_class_members", checkAccess(["CLASS", "ADMIN"]), classController.kickClassMembers);
router.get("/get_class_members", checkAccess(["CLASS"]), classController.getClassMembers);
router.get("/get_logged_out_users_role", checkAccess(["CLASS"]), classController.getUsersLoggedOutRole);
router.post("/set_logged_out_users_role", checkAccess(["CLASS", "ADMIN"]), classController.setUsersLoggedOutRole);
// temp disable route
//router.post("/update_dsb_mobile_data", checkAccess(["ACCOUNT", "CLASS", "MANAGER"]), classController.updateDSBMobileData);

export default router;