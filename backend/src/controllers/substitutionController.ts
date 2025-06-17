import substitutionService from "../services/substitutionService";
import asyncHandler from "express-async-handler";

export const getSubstitutionData = asyncHandler(async (req, res, next) => {
  try {
    const substitutionData = await substitutionService.getSubstitutionData();
    res.status(200).json(substitutionData);
  }
  catch (error) {
    next(error);
  }
});

export default {
  getSubstitutionData
};
