import express from "express";
import userController from "../controllers/accountController";
import checkAccess from "../middleware/accessMiddleware";

const router = express.Router();

router.post("/register", userController.registerAccount);
router.post("/login", userController.loginAccount);
router.post("/delete", checkAccess.checkAccount, userController.deleteAccount);
router.post("/change_username", checkAccess.checkAccount, userController.changeUsername);
router.post("/change_password", checkAccess.checkAccount, userController.changePassword);
router.get("/auth", userController.getAuth);
router.post("/logout", checkAccess.checkAccount, userController.logoutAccount);
router.post("/checkusername", userController.checkUsername);
router.post("/join", checkAccess.checkAccount, userController.joinClass);

export default router;
