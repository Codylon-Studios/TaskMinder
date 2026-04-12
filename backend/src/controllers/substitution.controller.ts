import { Request, Response, NextFunction } from "express";
import substitutionService from "../services/substitution.service.js";

export const getSubstitutions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const substitutionData = await substitutionService.getSubstitutionData(req.session);
    res.status(200).json(substitutionData);
  }
  catch (error) {
    next(error);
  }
};

export default {
  getSubstitutions
};
