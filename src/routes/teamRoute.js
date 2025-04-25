const express = require("express");
const {teamsController} = require("../controllers/teamController")
const checkAccess = require("../middleware/accessMiddleware")

const router = express.Router();

router.get("/get_teams_data", checkAccess.elseUnauthorized, teamsController.getTeams);
router.post("/set_teams_data", checkAccess.elseUnauthorized, teamsController.setTeams);
router.get("/get_joined_teams_data", checkAccess.elseUnauthorized, teamsController.getJoinedTeams);
router.post("/set_joined_teams_data", checkAccess.elseUnauthorized, teamsController.setJoinedTeams);

module.exports = router
