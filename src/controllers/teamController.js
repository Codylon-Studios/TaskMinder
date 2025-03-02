const teamsService = require('../services/teamService');
const asyncHandler = require('express-async-handler');

exports.teamsController = {
    getTeams: asyncHandler(async(req, res, next) => {
        try {
            const response = await teamsService.getTeamsData();
            res.json(response);
        } catch (error) {
            next(error);
        }
    }),
    getJoinedTeams: asyncHandler(async(req, res, next) => {
        try {
            const response = await teamsService.getJoinedTeamsData(req.session);
            res.json(response);
        } catch (error) {
            next(error);
        }
    }),
    setJoinedTeams: asyncHandler(async(req, res, next) => {
        const { teams } = req.body;
        try {
            await teamsService.setJoinedTeamsData(teams, req.session);
            res.status(200).send('0');
        } catch (error) {
            next(error);
        }
    }),
};
