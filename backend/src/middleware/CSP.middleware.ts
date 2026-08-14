import helmet from "helmet";
import { RequestHandler } from "express";
import { envConfig } from "../config/env.js";

export const CSPMiddleware = (): RequestHandler => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "script-src": envConfig.nodeEnv === "PRODUCTION" ? [
          "'self'",
          "'sha256-QFw+QUzHJldIS6KPHm5fwXGah0NptK7NyfaX02zG9nc='",
          "'sha256-3fZXNfKWLWGx+X4+QnkmeW5Tkw85iCAvVLYdxv26qD4='"
        ] : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "connect-src": ["'self'", "blob:"],
        "font-src": ["'self'"],
        "object-src": ["'self'", "blob:"],
        "img-src": ["'self'", "data:", "blob:"],
        "media-src": ["'self'", "blob:"],
        "frame-src": ["'self'", "blob:"]
      }
    },
    referrerPolicy: {
      policy: "same-origin"
    }
  });
};