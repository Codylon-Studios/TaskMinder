import express from "express";
import teamsController from "../controllers/team.controller";
import checkAccess from "../middleware/access.middleware";
import { setJoinedTeamsSchema, setTeamsSchema } from "../schemas/team.schema";
import { validate } from "../middleware/validation.middleware";

const router = express.Router();

router.get("/get_teams_data", checkAccess(["CLASS"]), teamsController.getTeams);
router.post("/set_teams_data", checkAccess(["CLASS", "MANAGER"]), validate(setTeamsSchema), teamsController.setTeams);
router.get("/get_joined_teams_data", checkAccess(["CLASS", "ACCOUNT"]), teamsController.getJoinedTeams);
router.post("/set_joined_teams_data", checkAccess(["CLASS", "ACCOUNT"]), validate(setJoinedTeamsSchema), teamsController.setJoinedTeams);

export default router;
