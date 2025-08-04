import teamService from "../services/teamService";
import asyncHandler from "express-async-handler";
import { z } from "zod";

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
  const setTeamsSchema = z.object({
    teams: z.array(
      z.object({
        teamId: z.union([z.literal(""), z.coerce.number()]),
        name: z.string()
      })
    )
  });
  const parseResult = setTeamsSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Invalid request format",
      expectedFormat: {
        type: "object",
        properties: {
          teams: {
            type: "array",
            items: {
              type: "object",
              properties: {
                teamId: { anyOf: [{ type: "number" }, { const: "" }] },
                name: { type: "string" }
              },
              required: ["teamId", "name"]
            }
          }
        },
        required: ["teams"]
      }
    });
    return;
  }
  try {
    await teamService.setTeamsData(parseResult.data.teams, req.session);
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
  const setTeamsSchema = z.object({
    teams: z.array(z.number())
  });
  const parseResult = setTeamsSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Invalid request format",
      expectedFormat: {
        type: "object",
        properties: {
          teams: {
            type: "array",
            items: { type: "number" }
          }
        },
        required: ["teams"]
      }
    });
    return;
  }
  try {
    await teamService.setJoinedTeamsData(parseResult.data.teams, req.session);
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
