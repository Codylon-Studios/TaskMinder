import helmet from "helmet";
import { RequestHandler } from "express";

export const CSPMiddleware = (): RequestHandler => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "script-src": [
          "'self'",
          "'sha256-OviHjJ7w1vAv612HhIiu5g+DltgQcknWb7V6OYt6Rss='",
          "'sha256-1kbQCzOR6DelBxT2yrtpf0N4phdVPuIOgvwMFeFkpBk='"
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
      policy: "strict-origin-when-cross-origin"
    }
  });
};
