import express from "express";
import teamsController from "../controllers/teamController";
import checkAccess from "../middleware/accessMiddleware";

const router = express.Router();

router.get("/get_teams_data", checkAccess.checkClass, teamsController.getTeams);
router.post("/set_teams_data", checkAccess.checkAccountAndClass, checkAccess.checkPermissionLevel(2), teamsController.setTeams);
router.get("/get_joined_teams_data", checkAccess.checkAccountAndClass, teamsController.getJoinedTeams);
router.post("/set_joined_teams_data", checkAccess.checkAccountAndClass, teamsController.setJoinedTeams);

export default router;
