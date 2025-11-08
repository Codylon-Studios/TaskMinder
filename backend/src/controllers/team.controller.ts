import teamService from "../services/team.service";
import asyncHandler from "express-async-handler";

export const getTeams = asyncHandler(async (req, res, next) => {
  try {
    const teamsData = await teamService.getTeamsData(req.session);
    res.status(200).json(teamsData);
  }
  catch (error) {
    next(error);
  }
});

export const setTeams = asyncHandler(async (req, res, next) => {
  try {
    await teamService.setTeamsData(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export const getJoinedTeams = asyncHandler(async (req, res, next) => {
  try {
    const joinedTeamsData = await teamService.getJoinedTeamsData(req.session);
    res.status(200).json(joinedTeamsData);
  }
  catch (error) {
    next(error);
  }
});

export const setJoinedTeams = asyncHandler(async (req, res, next) => {
  try {
    await teamService.setJoinedTeamsData(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
});

export default {
  getTeams,
  setTeams,
  getJoinedTeams,
  setJoinedTeams
};
