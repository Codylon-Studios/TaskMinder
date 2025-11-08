import client from "prom-client";

export const register = new client.Registry();
register.setDefaultLabels({
  app: "taskminder-bun"
});

export const httpRequestDurationMicroseconds = new client.Histogram({
  name: "http_request_duration_ms",
  help: "Duration of HTTP requests in ms",
  labelNames: ["method", "route", "code"],
  buckets: [50, 100, 200, 300, 400, 500, 750, 1000, 2000]
});
register.registerMetric(httpRequestDurationMicroseconds);

client.collectDefaultMetrics({ register });