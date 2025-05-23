import express from "express";
import classController from "../controllers/classController";
import checkAccess from "../middleware/accessMiddleware";

const router = express.Router();

router.get("/get_classcode", checkAccess.elseUnauthorized, classController.getClassCode);

export default router;
