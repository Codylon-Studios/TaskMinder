import express from "express";
import substitutionController from "../controllers/substitution.controller";
import checkAccess from "../middleware/access.middleware";

const router = express.Router();

router.get("/get_substitutions_data", checkAccess(["CLASS"]), substitutionController.getSubstitutionData);

export default router;
