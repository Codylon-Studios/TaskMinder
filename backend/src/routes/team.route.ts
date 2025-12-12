import express from "express";
import rateLimit from "express-rate-limit";
import teamsController from "../controllers/team.controller";
import checkAccess from "../middleware/access.middleware";
import { setJoinedTeamsSchema, setTeamsSchema } from "../schemas/team.schema";
import { validate } from "../middleware/validation.middleware";

// rate limiter
const teamLimiter = rateLimit({
  windowMs: 1000, // 1 second
  limit: 15, // Max 15 requests per IP per second
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { status: 429, message: "Too many requests, please slow down." }
});

const router = express.Router();

router.get("/get_teams_data", teamLimiter, checkAccess(["CLASS"]), teamsController.getTeams);
router.post("/set_teams_data", teamLimiter, checkAccess(["CLASS", "MANAGER"]), validate(setTeamsSchema), teamsController.setTeams);
router.get("/get_joined_teams_data", teamLimiter, checkAccess(["CLASS", "ACCOUNT"]), teamsController.getJoinedTeams);
router.post("/set_joined_teams_data", teamLimiter, checkAccess(["CLASS", "ACCOUNT"]), validate(setJoinedTeamsSchema), teamsController.setJoinedTeams);

export default router;
