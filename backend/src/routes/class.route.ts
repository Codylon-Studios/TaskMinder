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

// class rate limiters
const readClassLimiter = rateLimit({ windowMs: 1000, limit: 30 });
const writeClassLimiter = rateLimit({ windowMs: 1000, limit: 10 });

const router = express.Router();

router.get("/:id", readClassLimiter, checkAccess(["CLASS"]), classController.getClassInfo);
router.post("/", writeClassLimiter, checkAccess(["ACCOUNT"]), validate(createClassSchema), classController.createClass);
router.post("/join", writeClassLimiter, validate(joinClassSchema), classController.joinClass);
router.delete("/:id/members/me", writeClassLimiter, checkAccess(["CLASS"]), classController.leaveClass);
router.delete("/:id", writeClassLimiter, checkAccess(["CLASS", "ADMIN"]), classController.deleteClass);
router.patch(
  "/:id/default-permission",
  writeClassLimiter,
  checkAccess(["CLASS", "ADMIN"]),
  validate(changeDefaultPermissionSchema),
  classController.changeDefaultPermission
);
router.put(
  "/:id/members/permissions",
  writeClassLimiter,
  checkAccess(["CLASS", "ADMIN"]),
  validate(setClassMembersPermissionsSchema),
  classController.setClassMembersPermissions
);
router.delete("/:id/members", writeClassLimiter, checkAccess(["CLASS", "ADMIN"]), validate(kickClassMembersSchema), classController.kickClassMembers);
router.get("/:id/members", readClassLimiter, checkAccess(["CLASS"]), classController.getClassMembers);
router.post("/:id/members/kick-logged-out", writeClassLimiter, checkAccess(["CLASS", "ADMIN"]), classController.kickLoggedOutUsers);
router.patch("/:id/name", writeClassLimiter, checkAccess(["CLASS", "MANAGER"]), validate(changeClassNameSchema), classController.changeClassName);
router.patch("/:id/code/regenerate", writeClassLimiter, checkAccess(["CLASS", "ADMIN"]), classController.changeClassCode);
router.post("/:id/upgrade-test-class", writeClassLimiter, checkAccess(["CLASS", "ADMIN"]), classController.upgradeTestClass);

export default router;