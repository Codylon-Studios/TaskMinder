import express from "express";
import { register } from "../config/prom.client";
import logger from "../config/logger";

const metricsApp = express();
const metricsPort = 9100;

metricsApp.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } 
  catch (ex) {
    res.status(500).end(ex);
  }
});

export const startMetricsServer = (): void => {
  metricsApp.listen(metricsPort, () => {
    logger.info(`Metrics server listening on port ${metricsPort}`);
  });
};