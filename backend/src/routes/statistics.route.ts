import express from "express";
import rateLimit from "express-rate-limit";
import statisticsController from "../controllers/statistics.controller.js";

const readStatisticsLimiter = rateLimit({ windowMs: 1000, limit: 30 });

const router = express.Router();

router.get("/", readStatisticsLimiter, statisticsController.getStatistics);

export default router;
