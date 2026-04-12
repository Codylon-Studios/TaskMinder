import express from "express";
import rateLimit from "express-rate-limit";
import classController from "../controllers/class.controller.js";
import checkAccess from "../middleware/access.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { 
  changeClassNameSchema,
  changeClassCodeSchema,
  changeDefaultPermissionSchema, 
  createClassSchema, 
  deleteClassSchema,
  getClassInfoSchema,
  getClassMembersSchema,
  joinClassSchema, 
  kickLoggedOutUsersSchema,
  kickClassMembersSchema, 
  leaveClassSchema,
  upgradeTestClassSchema,
  setClassMembersPermissionsSchema
} from "../schemas/class.schema.js";

// class rate limiters
const readClassLimiter = rateLimit({ windowMs: 1000, limit: 30 });
const writeClassLimiter = rateLimit({ windowMs: 1000, limit: 10 });

const router = express.Router();

router.get("/:id", readClassLimiter, checkAccess(["CLASS"]), validate(getClassInfoSchema), classController.getClassInfo);
router.post("/", writeClassLimiter, checkAccess(["ACCOUNT"]), validate(createClassSchema), classController.createClass);
router.post("/join", writeClassLimiter, validate(joinClassSchema), classController.joinClass);
router.delete("/:id/members/me", writeClassLimiter, checkAccess(["CLASS"]), validate(leaveClassSchema), classController.leaveClass);
router.delete("/:id", writeClassLimiter, checkAccess(["CLASS", "ADMIN"]), validate(deleteClassSchema), classController.deleteClass);
router.patch(
  "/:id/default-permission",
  writeClassLimiter,
  checkAccess(["CLASS", "ADMIN"]),
  validate(changeDefaultPermissionSchema),
  classController.changeDefaultPermission
);
router.patch(
  "/:id/members/permissions",
  writeClassLimiter,
  checkAccess(["CLASS", "ADMIN"]),
  validate(setClassMembersPermissionsSchema),
  classController.setClassMembersPermissions
);
router.delete("/:id/members", writeClassLimiter, checkAccess(["CLASS", "ADMIN"]), validate(kickClassMembersSchema), classController.kickClassMembers);
router.get("/:id/members", readClassLimiter, checkAccess(["CLASS"]), validate(getClassMembersSchema), classController.getClassMembers);
router.post(
  "/:id/members/kick-logged-out", 
  writeClassLimiter, 
  checkAccess(["CLASS", "ADMIN"]), 
  validate(kickLoggedOutUsersSchema), 
  classController.kickLoggedOutUsers
);
router.patch("/:id/name", writeClassLimiter, checkAccess(["CLASS", "MANAGER"]), validate(changeClassNameSchema), classController.changeClassName);
router.patch(
  "/:id/code", 
  writeClassLimiter, 
  checkAccess(["CLASS", "ADMIN"]), 
  validate(changeClassCodeSchema), 
  classController.changeClassCode
);
router.post(
  "/:id/upgrade-test-class", 
  writeClassLimiter, 
  checkAccess(["CLASS", "ADMIN"]), 
  validate(upgradeTestClassSchema), 
  classController.upgradeTestClass
);

export default router;