import classService from "../services/classService";
import asyncHandler from "express-async-handler";

export const getClassCode = asyncHandler(async (req, res, next) => {
  try {
    const classCode = await classService.getClassCode(req.session);
    res.status(200).json(classCode);
  } catch (error) {
    next(error);
  }
});

export default {
  getClassCode,
};
