import { Request, Response, NextFunction } from "express";
import statisticsService from "../services/statistics.service.js";

export const getStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const statistics = await statisticsService.getStatistics();
    res
      .set("Cache-Control", "public, max-age=300")
      .status(200)
      .json(statistics);
  }
  catch (error) {
    next(error);
  }
};

export default {
  getStatistics
};
