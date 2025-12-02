import express from "express";
import rateLimit from "express-rate-limit";
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

// rate limiter
const classLimiter = rateLimit({
  windowMs: 1000, // 1 second
  limit: 15, // Max 15 requests per IP per second
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { status: 429, message: "Too many requests, please slow down." }
});

const router = express.Router();

router.get("/get_class_info", classLimiter, checkAccess(["CLASS"]), classController.getClassInfo);
router.post("/create_class", classLimiter, checkAccess(["ACCOUNT"]), validate(createClassSchema), classController.createClass);
router.post("/join", classLimiter, validate(joinClassSchema), classController.joinClass);
router.post("/leave_class", classLimiter, checkAccess(["CLASS"]), classController.leaveClass);
router.post("/delete_class", classLimiter, checkAccess(["CLASS", "ADMIN"]), classController.deleteClass);
// eslint-disable-next-line
router.post("/change_default_permission", classLimiter, checkAccess(["CLASS", "ADMIN"]), validate(changeDefaultPermissionSchema), classController.changeDefaultPermission);
// eslint-disable-next-line
router.post("/set_class_members_permission", classLimiter, checkAccess(["CLASS", "ADMIN"]), validate(setClassMembersPermissionsSchema), classController.setClassMembersPermissions);
router.post("/kick_class_members", classLimiter, checkAccess(["CLASS", "ADMIN"]), validate(kickClassMembersSchema), classController.kickClassMembers);
router.get("/get_class_members", classLimiter, checkAccess(["CLASS"]), classController.getClassMembers);
router.get("/get_logged_out_users_role", classLimiter, checkAccess(["CLASS"]), classController.getUsersLoggedOutRole);
router.post("/kick_logged_out_users", classLimiter, checkAccess(["CLASS", "ADMIN"]), classController.kickLoggedOutUsers);
// temp disable route
// eslint-disable-next-line
//router.post("/update_dsb_mobile_data", checkAccess(["ACCOUNT", "CLASS", "MANAGER"]), validate(updateDSBMobileDataSchema), classController.updateDSBMobileData);
router.post("/change_class_name", classLimiter, checkAccess(["CLASS", "MANAGER"]), validate(changeClassNameSchema), classController.changeClassName);
router.post("/change_class_code", classLimiter, checkAccess(["CLASS", "ADMIN"]), classController.changeClassCode);
router.post("/upgrade_test_class", classLimiter, checkAccess(["CLASS", "ADMIN"]), classController.upgradeTestClass);

export default router;