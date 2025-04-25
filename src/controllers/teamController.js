const teamService = require("../services/teamService");
const asyncHandler = require("express-async-handler");

exports.teamsController = {
  getTeams: asyncHandler(async(req, res, next) => {
    try {
      const teamsData = await teamService.getTeamsData();
      res.status(200).json(teamsData);
    } catch (error) {
      next(error);
    }
  }),
  setTeams: asyncHandler(async(req, res, next) => {
    const { teams } = req.body;
    try {
      await teamService.setTeamsData(teams);
      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  }),
  getJoinedTeams: asyncHandler(async(req, res, next) => {
    try {
      const joinedTeamsData = await teamService.getJoinedTeamsData(req.session);
      res.status(200).json(joinedTeamsData);
    } catch (error) {
      next(error);
    }
  }),
  setJoinedTeams: asyncHandler(async(req, res, next) => {
    const { teams } = req.body;
    try {
      await teamService.setJoinedTeamsData(teams, req.session);
      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  }),
};
