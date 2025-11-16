import express from "express";
import classController from "../controllers/class.controller";
import checkAccess from "../middleware/access.middleware";
import { validate } from "../middleware/validation.middleware";
import { 
  changeClassNameSchema,
  changeDefaultPermissionSchema, 
  createClassSchema, 
  joinClassSchema, 
  kickClassMembersSchema, 
  setClassMembersPermissionsSchema
} from "../schemas/class.schema";

const router = express.Router();

router.get("/get_class_info", checkAccess(["CLASS"]), classController.getClassInfo);
router.post("/create_class", checkAccess(["ACCOUNT"]), validate(createClassSchema), classController.createClass);
router.post("/join", validate(joinClassSchema), classController.joinClass);
router.post("/leave_class", checkAccess(["CLASS"]), classController.leaveClass);
router.post("/delete_class", checkAccess(["CLASS", "ADMIN"]), classController.deleteClass);
// eslint-disable-next-line
router.post("/change_default_permission", checkAccess(["CLASS", "ADMIN"]), validate(changeDefaultPermissionSchema), classController.changeDefaultPermission);
// eslint-disable-next-line
router.post("/set_class_members_permission", checkAccess(["CLASS", "ADMIN"]), validate(setClassMembersPermissionsSchema), classController.setClassMembersPermissions);
router.post("/kick_class_members", checkAccess(["CLASS", "ADMIN"]), validate(kickClassMembersSchema), classController.kickClassMembers);
router.get("/get_class_members", checkAccess(["CLASS"]), classController.getClassMembers);
router.get("/get_logged_out_users_role", checkAccess(["CLASS"]), classController.getUsersLoggedOutRole);
router.post("/kick_logged_out_users", checkAccess(["CLASS", "ADMIN"]), classController.kickLoggedOutUsers);
// temp disable route
// eslint-disable-next-line
//router.post("/update_dsb_mobile_data", checkAccess(["ACCOUNT", "CLASS", "MANAGER"]), validate(updateDSBMobileDataSchema), classController.updateDSBMobileData);
router.post("/change_class_name", checkAccess(["CLASS", "MANAGER"]), validate(changeClassNameSchema), classController.changeClassName);
router.post("/change_class_code", checkAccess(["CLASS", "ADMIN"]), classController.changeClassCode);
router.post("/upgrade_test_class", checkAccess(["CLASS", "ADMIN"]), classController.upgradeTestClass);

export default router;