import express, { Request, Response, NextFunction } from "express";
import session from "express-session";
import { createServer } from "http";
import webpush from "web-push"
import path from "path";
import compression from "compression";
import helmet from "helmet";
import cron from "node-cron";
import { rateLimit } from "express-rate-limit";
import { Pool } from "pg";
import socketIO from "./config/socket";
import * as dotenv from "dotenv";
import { ErrorHandler } from "./middleware/errorMiddleware";
import RequestLogger from "./middleware/loggerMiddleware";
import checkAccess from "./middleware/accessMiddleware";
import logger from "./utils/logger";
import cleanupOldHomework from "./utils/homeworkCleanup";
import { createDBBackup } from "./utils/backupTable";
import connectPgSimple from "connect-pg-simple";
import sequelize from "./config/sequelize";
import notification from "./routes/notificationRoute";
import account from "./routes/accountRoute";
import homework from "./routes/homeworkRoute";
import substitutions from "./routes/substitutionRoute";
import teams from "./routes/teamRoute";
import events from "./routes/eventRoute";
import subjects from "./routes/subjectRoute";
import timetable from "./routes/timetableRoute";
import client from 'prom-client';

dotenv.config()

const publicKey = process.env.VAPID_PUBLIC_KEY!;
const privateKey = process.env.VAPID_PRIVATE_KEY!;

webpush.setVapidDetails(
  'mailto:codylon.studios@gmail.com', // CHANGE EMAIL IN PRODUCTION
  publicKey,
  privateKey
);

declare module 'express-session' {
  interface SessionData {
    account?: {
      accountId: number;
      username: string;
    };
    loggedIn: boolean;
    classJoined: boolean;
  }
}

const app = express();
const server = createServer(app);
const io = socketIO.initialize(server);

if (process.env.NODE_ENV !== "DEVELOPMENT") {

  const register = new client.Registry();
  register.setDefaultLabels({
    app: 'taskminder-nodejs'
  });

  client.collectDefaultMetrics({ register });

  const httpRequestDurationMicroseconds = new client.Histogram({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in ms',
    labelNames: ['method', 'route', 'code'],
    buckets: [50, 100, 200, 300, 400, 500, 750, 1000, 2000]
  });
  register.registerMetric(httpRequestDurationMicroseconds);

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (
      req.path === '/metrics' ||
      req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|map)$/i)
    ) {
      return next();
    }

    const end = httpRequestDurationMicroseconds.startTimer();
    res.on('finish', () => {
      const route = (req.route && req.route.path) ? req.route.path : req.path;
      end({ route, code: res.statusCode, method: req.method });
    });

    next();
  });

  app.get('/metrics', async (req: Request, res: Response) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

}

server.listen(3000, () => {
  logger.success("Server running at http://localhost:3000");
});

// Schedule the cron job to run at midnight (00:00) every day
cron.schedule("0 0 * * *", () => {
  logger.info("Starting scheduled homework cleanup");
  cleanupOldHomework();
});

// Schedule PostgreSQL backup every hour every day
cron.schedule("0 * * * *", () => {
  logger.info("Starting hourly PostgreSQL backup");
  createDBBackup();
});

const sessionPool = new Pool({
  user: sequelize.config.username,
  host: sequelize.config.host,
  database: sequelize.config.database,
  password: sequelize.config.password ?? "secret",
  port: parseInt(sequelize.config.port ?? "0"),
});

const limiter = rateLimit({
  windowMs: 1000, // 1 second
  limit: 70, // Max 70 requests per IP per second
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { status: 429, message: "Too many requests, please slow down." }
});

app.use(limiter)

if (process.env.NODE_ENV !== "DEVELOPMENT") {
  // Content Security Policy
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "script-src": [
          '"self"',
        ],
        "connect-src": [
          '"self"',
          "wss://*"
        ],
        "style-src": [
          '"self"',
          '"unsafe-inline"'
        ],
        "font-src": [
          '"self"',
        ],
        "img-src": ["'self'", "data:"],
        "object-src": ["'none'"],
        "frame-ancestors": ["'self'"]
      },
    },
    referrerPolicy: {
      policy: "strict-origin-when-cross-origin"
    },
  }));
}

app.use(compression());
// Middleware to parse request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.static("frontend/dist"));
app.use(express.json());

const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  logger.error("SESSION_SECRET is undefined! Please define in the .env file.");
  process.exit(1);
}

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
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV !== "DEVELOPMENT",
  }, //30 days
  name: "UserLogin",
});

app.use(sessionMiddleware);
app.use(RequestLogger);
app.use("/notifications", notification);
app.use("/docs", express.static(path.join(__dirname, "..", "..", "docs", "dist")));
app.use("/account", account);
app.use("/homework", homework);
app.use("/substitutions", substitutions);
app.use("/teams", teams);
app.use("/events", events);
app.use("/subjects", subjects);
app.use("/timetable", timetable);
app.use(ErrorHandler);

// Sync models with the database
sequelize.sync({ alter: true })
  .then(() => logger.success("Database synced"));

sequelize.authenticate()
  .then(() => logger.success("Connected to PostgreSQL"))
  .catch((err: unknown) => {
    if (err instanceof Error) {
      logger.error("Unable to connect to PostgreSQL:", err.message)
    }
  });

app.get('/vapidPublicKey', (_req, res) => {
  res.send(process.env.VAPID_PUBLIC_KEY);
});

app.get("/", (req: Request, res: Response) => {
  if (req.session.account && req.session.classJoined) {
    return res.redirect(302, "/main");
  }
  res.redirect(302, "/join");
})

let pagesPath = path.join(__dirname, "..", "..", "frontend", "dist", "pages")

app.get("/join", (req, res) => {
  if (req.session.account && req.session.classJoined) {
    return res.redirect(302, "/main");
  }
  else if (!req.query.action) {
    if (req.session.account) {
      return res.redirect(302, "/join?action=join");
    }
    else if (req.session.classJoined) {
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
