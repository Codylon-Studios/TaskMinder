import express from "express";
import teamsController from "../controllers/teamController";
import checkAccess from "../middleware/accessMiddleware";

const router = express.Router();

router.get("/get_teams_data", checkAccess(["CLASS"]), teamsController.getTeams);
router.post("/set_teams_data", checkAccess(["CLASS", "MANAGER"]), teamsController.setTeams);
router.get("/get_joined_teams_data", checkAccess(["CLASS", "ACCOUNT"]), teamsController.getJoinedTeams);
router.post("/set_joined_teams_data", checkAccess(["CLASS", "ACCOUNT"]), teamsController.setJoinedTeams);

export default router;
