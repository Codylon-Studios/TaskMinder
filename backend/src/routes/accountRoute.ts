import express from "express";
import userController from "../controllers/accountController";
import checkAccess from "../middleware/accessMiddleware";
import { validate } from "../middleware/validationMiddleware";
import { 
  changePasswordSchema, 
  changeUsernameSchema, 
  checkUsernameSchema, 
  deleteAccountSchema, 
  loginAccountSchema, 
  registerAccountSchema 
} from "../schemas/accountSchema";

const router = express.Router();

router.post("/register", validate(registerAccountSchema), userController.registerAccount);
router.post("/login", validate(loginAccountSchema), userController.loginAccount);
router.post("/delete", checkAccess(["ACCOUNT"]), validate(deleteAccountSchema), userController.deleteAccount);
router.post("/change_username", checkAccess(["ACCOUNT"]), validate(changeUsernameSchema), userController.changeUsername);
router.post("/change_password", checkAccess(["ACCOUNT"]), validate(changePasswordSchema), userController.changePassword);
router.get("/auth", userController.getAuth);
router.post("/logout", checkAccess(["ACCOUNT"]), userController.logoutAccount);
router.post("/checkusername", validate(checkUsernameSchema), userController.checkUsername);

export default router;
