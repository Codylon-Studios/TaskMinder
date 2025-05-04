import express from "express";
import userController from "../controllers/accountController";

const router = express.Router();

router.post("/register", userController.registerAccount);
router.post("/login", userController.loginAccount);
router.post("/delete", userController.deleteAccount);
router.get("/auth", userController.getAuth);
router.post("/logout", userController.logoutAccount);
router.post("/checkusername", userController.checkUsername);
router.post("/join", userController.joinClass)

export default router;
