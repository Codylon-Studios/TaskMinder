import express from "express";
import teamsController from "../controllers/teamController";
import checkAccess from "../middleware/accessMiddleware";
import { setJoinedTeamsSchema, setTeamsSchema } from "../schemas/teamSchema";
import { validate } from "../middleware/validationMiddleware";

const router = express.Router();

router.get("/get_teams_data", checkAccess(["CLASS"]), teamsController.getTeams);
router.post("/set_teams_data", checkAccess(["CLASS", "MANAGER"]), validate(setTeamsSchema), teamsController.setTeams);
router.get("/get_joined_teams_data", checkAccess(["CLASS", "ACCOUNT"]), teamsController.getJoinedTeams);
router.post("/set_joined_teams_data", checkAccess(["CLASS", "ACCOUNT"]), validate(setJoinedTeamsSchema), teamsController.setJoinedTeams);

export default router;
