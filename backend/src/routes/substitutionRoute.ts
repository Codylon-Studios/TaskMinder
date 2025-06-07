import express from "express";
import substitutionController from "../controllers/substitutionController";
import checkAccess from "../middleware/accessMiddleware";

const router = express.Router();

router.get(
  "/get_substitutions_data",
  checkAccess.elseUnauthorized,
  substitutionController.getSubstitutionData
);

export default router;
