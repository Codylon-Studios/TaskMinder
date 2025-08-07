import express from "express";
import userController from "../controllers/accountController";
import checkAccess from "../middleware/accessMiddleware";

const router = express.Router();

router.post("/register", userController.registerAccount);
router.post("/login", userController.loginAccount);
router.post("/delete", checkAccess(["ACCOUNT"]), userController.deleteAccount);
router.post("/change_username", checkAccess(["ACCOUNT"]), userController.changeUsername);
router.post("/change_password", checkAccess(["ACCOUNT"]), userController.changePassword);
router.get("/auth", userController.getAuth);
router.post("/logout", checkAccess(["ACCOUNT"]), userController.logoutAccount);
router.post("/checkusername", userController.checkUsername);

export default router;
