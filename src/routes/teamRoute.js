const express = require("express");
const {teamsController} = require('../controllers/teamController')

const router = express.Router();

router.get('/get_teams_data', teamsController.getTeams);
router.post('/set_teams_data', teamsController.setTeams);
router.get('/get_joined_teams_data', teamsController.getJoinedTeams);
router.post('/set_joined_teams_data', teamsController.setJoinedTeams);


module.exports = router
