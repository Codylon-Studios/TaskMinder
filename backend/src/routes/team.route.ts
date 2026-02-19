import express from "express";
import rateLimit from "express-rate-limit";
import teamsController from "../controllers/team.controller.js";
import checkAccess from "../middleware/access.middleware.js";
import { setJoinedTeamsSchema, setTeamsSchema } from "../schemas/team.schema.js";
import { validate } from "../middleware/validation.middleware.js";

// team rate limiters
const readTeamLimiter = rateLimit({ windowMs: 1000, limit: 30 });
const writeTeamLimiter = rateLimit({ windowMs: 1000, limit: 10 });

const router = express.Router();

router.get("/", readTeamLimiter, checkAccess(["CLASS"]), teamsController.getTeams);
router.get("/joined", readTeamLimiter, checkAccess(["CLASS", "ACCOUNT"]), teamsController.getJoinedTeams);

router.put("/", writeTeamLimiter, checkAccess(["CLASS", "MANAGER"]), validate(setTeamsSchema), teamsController.setTeams);
router.put("/joined", writeTeamLimiter, checkAccess(["CLASS", "ACCOUNT"]), validate(setJoinedTeamsSchema), teamsController.setJoinedTeams);

export default router;
