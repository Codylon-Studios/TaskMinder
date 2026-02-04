import express from "express";
import rateLimit from "express-rate-limit";
import teamsController from "../controllers/team.controller";
import checkAccess from "../middleware/access.middleware";
import { 
  addPrivateTeamSchema, 
  deletePrivateTeamSchema,
  joinPrivateTeamSchema, 
  leavePrivateTeamSchema,
  setJoinedTeamsSchema, 
  setTeamsSchema 
} from "../schemas/team.schema";
import { validate } from "../middleware/validation.middleware";

// team rate limiter
const teamLimiter = rateLimit({
  windowMs: 1000, // 1 second
  limit: 15, // Max 15 requests per IP per second
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { status: 429, message: "Too many requests, please slow down." }
});

const router = express.Router();

// get public and private teams (if logged in) data: teamId, name, isPrivate, inviteCode (decrypted)
router.get("/get_teams_data", teamLimiter, checkAccess(["CLASS"]), teamsController.getTeams);
// set only public teams data (name, manager required)
router.post("/set_teams_data", teamLimiter, checkAccess(["CLASS", "MANAGER"]), validate(setTeamsSchema), teamsController.setTeams);
// get all (public and private) joined teams ids (for logged in users)
router.get("/get_joined_teams_data", teamLimiter, checkAccess(["CLASS", "ACCOUNT"]), teamsController.getJoinedTeams);
// set only joined public teams (for logged in users)
router.post("/set_joined_teams_data", teamLimiter, checkAccess(["CLASS", "ACCOUNT"]), validate(setJoinedTeamsSchema), teamsController.setJoinedTeams);
// add private team (for logged in users)
router.post("/add_private_team", teamLimiter, checkAccess(["CLASS", "ACCOUNT"]), validate(addPrivateTeamSchema), teamsController.addPrivateTeam);
// join private team (for logged in users)
router.post("/join_private_team", teamLimiter, checkAccess(["CLASS", "ACCOUNT"]), validate(joinPrivateTeamSchema), teamsController.joinPrivateTeam);
// delete private team (for logged in users)
// eslint-disable-next-line max-len
router.post("/delete_private_team", teamLimiter, checkAccess(["CLASS", "ACCOUNT"]), validate(deletePrivateTeamSchema), teamsController.deletePrivateTeam);
// leave private team (for logged in users)
// eslint-disable-next-line max-len
router.post("/leave_private_team", teamLimiter, checkAccess(["CLASS", "ACCOUNT"]), validate(leavePrivateTeamSchema), teamsController.leavePrivateTeam);

export default router;
