import { createServer } from "http";
import path from "path";
import client from "prom-client";
import compression from "compression";
import connectPgSimple from "connect-pg-simple";
import cron from "node-cron";
import * as dotenv from "dotenv";
import express, { Request, Response, NextFunction } from "express";
import { rateLimit } from "express-rate-limit";
import session from "express-session";
import helmet from "helmet";
import { Pool } from "pg";
import prisma from "./config/prisma";
import socketIO from "./config/socket";
import checkAccess from "./middleware/accessMiddleware";
import { ErrorHandler } from "./middleware/errorMiddleware";
import RequestLogger from "./middleware/loggerMiddleware";
import cleanupOldHomework from "./utils/homeworkCleanup";
import { csrfProtection, csrfSessionInit } from "./middleware/csrfProtectionMiddleware";
import logger from "./utils/logger";
import account from "./routes/accountRoute";
import events from "./routes/eventRoute";
import homework from "./routes/homeworkRoute";
import lessons from "./routes/lessonRoute";
import substitutions from "./routes/substitutionRoute";
import subjects from "./routes/subjectRoute";
import teams from "./routes/teamRoute";
import classes from "./routes/classRoute";

dotenv.config();

declare module "express-session" {
  interface SessionData {
    account?: {
      accountId: number;
      username: string;
    };
    loggedIn: boolean;
    classJoined: boolean;
  }
}

const register = new client.Registry();
register.setDefaultLabels({
  app: "taskminder-nodejs"
});

const httpRequestDurationMicroseconds = new client.Histogram({
  name: "http_request_duration_ms",
  help: "Duration of HTTP requests in ms",
  labelNames: ["method", "route", "code"],
  buckets: [50, 100, 200, 300, 400, 500, 750, 1000, 2000]
});
register.registerMetric(httpRequestDurationMicroseconds);

client.collectDefaultMetrics({ register });

prisma
  .$connect()
  .then(() => {
    logger.info("Connected to Database");
  })
  .catch(err => {
    logger.error("DB connection failed:", err);
    process.exit(1);
  });

const sessionPool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432
});

const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  logger.error("SESSION_SECRET is undefined! Please define in the .env file.");
  process.exit(1);
}

const app = express();
app.set("trust proxy", 1);
const server = createServer(app);
socketIO.initialize(server);

const limiter = rateLimit({
  windowMs: 1000, // 1 second
  limit: 70, // Max 70 requests per IP per second
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { status: 429, message: "Too many requests, please slow down." }
});
app.use(limiter);

// Content Security Policy
if (process.env.UNSAFE_DEACTIVATE_CSP !== "true") {
  app.use(
    helmet({
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
    })
  );
}
else {
  logger.warn("Helmet and CSP is disabled! This is not recommended for production!");
}

app.use(compression());
app.use(express.static("frontend/dist"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path === "/metrics" || req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|map)$/i)) {
    return next();
  }
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on("finish", () => {
    const route = req.route && req.route.path ? req.route.path : req.path;
    end({ route, code: res.statusCode, method: req.method });
  });
  next();
});

const PgSession = connectPgSimple(session);

const sessionMiddleware = session({
  store: new PgSession({
    pool: sessionPool,
    tableName: "account_sessions",
    createTableIfMissing: true
  }),
  proxy: process.env.NODE_ENV !== "DEVELOPMENT",
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV !== "DEVELOPMENT"
  },
  name: "UserLogin"
});

app.use(sessionMiddleware);
app.use(csrfSessionInit);
app.get("/csrf-token", (req, res) => {
  res.json({ csrfToken: req.session.csrfToken });
});
app.use(csrfProtection);
app.use(RequestLogger);

app.get("/health", (req, res) => {
  res.status(200).json({ message: "service operational" });
});

app.get("/metrics", async (req: Request, res: Response) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.get("/", (req: Request, res: Response) => {
  if (req.session.account && req.session.classJoined) {
    return res.redirect(302, "/main");
  }
  res.redirect(302, "/join");
});

const pagesPath = path.join(__dirname, "..", "..", "frontend", "dist", "pages");

app.get("/join", (req, res) => {
  const action = req.query.action;

  if (req.session.account && req.session.classJoined) {
    return res.redirect(302, "/main");
  }

  if (req.session.account && !req.session.classJoined) {
    if (action !== "join") {
      return res.redirect(302, "/join?action=join");
    }
  }

  if (!req.session.account && req.session.classJoined) {
    if (action !== "account") {
      return res.redirect(302, "/join?action=account");
    }
  }
  res.sendFile(path.join(pagesPath, "join", "join.html"));
});

app.get("/settings", (req, res) => {
  res.sendFile(path.join(pagesPath, "settings", "settings.html"));
});

app.get("/about", (req, res) => {
  res.sendFile(path.join(pagesPath, "about", "about.html"));
});

app.use("/account", account);
app.use("/homework", homework);
app.use("/substitutions", substitutions);
app.use("/teams", teams);
app.use("/events", events);
app.use("/subjects", subjects);
app.use("/lessons", lessons);
app.use("/class", classes);

//
// Protected routes: Redirect to /join if not logged in
//
app.get("/main", checkAccess.elseRedirect, (req, res) => {
  res.sendFile(path.join(pagesPath, "main", "main.html"));
});

app.get("/homework", checkAccess.elseRedirect, (req, res) => {
  res.sendFile(path.join(pagesPath, "homework", "homework.html"));
});

app.get("/events", checkAccess.elseRedirect, (req, res) => {
  res.sendFile(path.join(pagesPath, "events", "events.html"));
});

app.use((req, res, next) => {
  res.status(404).send("Not found")
  next()
});

// Error Handler Middleware (Must be the last app.use)
app.use(ErrorHandler);

// Schedule the cron job to run at midnight (00:00) every day
cron.schedule("0 0 * * *", () => {
  logger.info("Starting scheduled homework cleanup");
  cleanupOldHomework();
});

server.listen(3000, () => {
  logger.success("Server running at http://localhost:3000");
});
