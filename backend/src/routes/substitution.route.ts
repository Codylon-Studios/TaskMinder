import express from "express";
import rateLimit from "express-rate-limit";
import substitutionController from "../controllers/substitution.controller";
import checkAccess from "../middleware/access.middleware";

// substitution rate limiter
const readSubstitutionLimiter = rateLimit({ windowMs: 1000, limit: 30 });

const router = express.Router();

router.get("/", readSubstitutionLimiter, checkAccess(["CLASS"]), substitutionController.getSubstitutions);

export default router;
