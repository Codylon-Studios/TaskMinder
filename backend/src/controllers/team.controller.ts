import { Request, Response, NextFunction } from "express";
import teamService from "../services/team.service";

export const getTeams = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teamsData = await teamService.getTeamsData(req.session);
    res.status(200).json(teamsData);
  }
  catch (error) {
    next(error);
  }
};

export const setTeams = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await teamService.setTeamsData(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export const getJoinedTeams = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const joinedTeamsData = await teamService.getJoinedTeamsData(req.session);
    res.status(200).json(joinedTeamsData);
  }
  catch (error) {
    next(error);
  }
};

export const setJoinedTeams = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await teamService.setJoinedTeamsData(req.body, req.session);
    res.sendStatus(200);
  }
  catch (error) {
    next(error);
  }
};

export default {
  getTeams,
  setTeams,
  getJoinedTeams,
  setJoinedTeams
};
