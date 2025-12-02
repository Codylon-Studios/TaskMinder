import express from "express";
import rateLimit from "express-rate-limit";
import substitutionController from "../controllers/substitution.controller";
import checkAccess from "../middleware/access.middleware";

// rate limiter
const substitutionLimiter = rateLimit({
  windowMs: 1000, // 1 second
  limit: 15, // Max 15 requests per IP per second
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { status: 429, message: "Too many requests, please slow down." }
});

const router = express.Router();

router.get("/get_substitutions_data", substitutionLimiter, checkAccess(["CLASS"]), substitutionController.getSubstitutionData);

export default router;
