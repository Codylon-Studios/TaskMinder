const teamsService = require('../services/teamService');
const asyncHandler = require('express-async-handler');

exports.teamsController = {
    getTeams: asyncHandler(async(req, res, next) => {
        try {
            const teamsData = await teamsService.getTeamsData();
            res.status(200).json(teamsData);
        } catch (error) {
            next(error);
        }
    }),
    getJoinedTeams: asyncHandler(async(req, res, next) => {
        try {
            const joinedTeamsData = await teamsService.getJoinedTeamsData(req.session);
            res.status(200).json(joinedTeamsData);
        } catch (error) {
            next(error);
        }
    }),
    setJoinedTeams: asyncHandler(async(req, res, next) => {
        const { teams } = req.body;
        try {
            await teamsService.setJoinedTeamsData(teams, req.session);
            res.sendStatus(200);
        } catch (error) {
            next(error);
        }
    }),
};
