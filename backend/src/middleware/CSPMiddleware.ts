import helmet from "helmet";
import { RequestHandler } from "express";

export const CSPMiddleware = (): RequestHandler => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "script-src": [
          "'self'",
          "'sha256-QFw+QUzHJldIS6KPHm5fwXGah0NptK7NyfaX02zG9nc='",
          "'sha256-3fZXNfKWLWGx+X4+QnkmeW5Tkw85iCAvVLYdxv26qD4='"
        ],
        "connect-src": ["'self'", "wss://*"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "font-src": ["'self'"],
        "img-src": ["'self'", "data:"],
        "object-src": ["'none'"],
        "frame-ancestors": ["'self'"]
      }
    },
    referrerPolicy: {
      policy: "same-origin"
    }
  });
};
