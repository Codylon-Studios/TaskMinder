import express from "express";
import rateLimit from "express-rate-limit";
import userController from "../controllers/account.controller";
import checkAccess from "../middleware/access.middleware";
import { validate } from "../middleware/validation.middleware";
import { 
  changePasswordSchema, 
  changeUsernameSchema, 
  checkUsernameSchema, 
  deleteAccountSchema, 
  loginAccountSchema, 
  registerAccountSchema 
} from "../schemas/account.schema";

// rate limiter
const authLimiter = rateLimit({
  windowMs: 1000, // 1 second
  limit: 15, // Max 15 requests per IP per second
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { status: 429, message: "Too many requests, please slow down." }
});

const router = express.Router();

router.post("/register", authLimiter, validate(registerAccountSchema), userController.registerAccount);
router.post("/login", authLimiter, validate(loginAccountSchema), userController.loginAccount);
router.post("/delete", authLimiter, checkAccess(["ACCOUNT"]), validate(deleteAccountSchema), userController.deleteAccount);
router.post("/change_username", authLimiter, checkAccess(["ACCOUNT"]), validate(changeUsernameSchema), userController.changeUsername);
router.post("/change_password", authLimiter, checkAccess(["ACCOUNT"]), validate(changePasswordSchema), userController.changePassword);
router.get("/auth", authLimiter, userController.getAuth);
router.post("/logout", authLimiter, checkAccess(["ACCOUNT"]), userController.logoutAccount);
router.post("/checkusername", authLimiter, validate(checkUsernameSchema), userController.checkUsername);

export default router;
