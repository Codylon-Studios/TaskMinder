import winston from "winston";
import chalk from "chalk";

chalk.level = 3;

const colorizeDuration = (duration: number): string => {
  const durationStr = `${duration.toString().padStart(3)}ms`;
  
  if (duration < 100) {
    return chalk.green(durationStr);
  } 
  else if (duration < 500) {
    return chalk.yellow(durationStr);
  } 
  else {
    return chalk.red(durationStr);
  }
};

const getStatusColor = (status: number): (s: string) => string => {
  if (status >= 500 && status < 600) return chalk.red;
  if (status >= 400 && status < 500) return chalk.yellow;
  if (status >= 300 && status < 400) return chalk.cyan;
  if (status >= 200 && status < 300) return chalk.green;
  return (s: string) => s;
};

const colorizeStatus = (status: number): string => {
  const colorFn = getStatusColor(status);
  return colorFn(status.toString());
};

const getColoredLevel = (level: string): string => {
  if (level.includes("error")) return chalk.red(level);
  if (level.includes("warn")) return chalk.yellow(level);
  if (level.includes("info")) return chalk.cyan(level);
  if (level.includes("debug")) return chalk.magenta(level);
  return level;
};

const buildPrefix = (level: string, timestamp?: string, isSocket?: boolean): string => {
  const coloredLevel = getColoredLevel(level);
  const serviceName = isSocket ? chalk.magenta("TaskMinder") : chalk.blue("TaskMinder");
  return `[${serviceName}] [${chalk.gray(timestamp || "")}] [${coloredLevel}]`;
};

const customFormat = winston.format.printf(({ message, timestamp, level, ...metadata }) => {
  // Extract additional metadata if present
  const { duration, method, path, status, isSocket } = metadata as {
    duration?: number;
    method?: string;
    path?: string;
    status?: number;
    isSocket?: boolean;
  };

  let logMessage = buildPrefix(level, timestamp as string, isSocket);

  if (duration !== undefined) {
    logMessage += `${colorizeDuration(duration)}`;
  }

  if (method && path && status !== undefined) {
    const coloredStatus = colorizeStatus(status);
    logMessage += ` ${chalk.bold(method)}  ${path} ${coloredStatus}`;
  }
  else if (message) {
    logMessage += ` ${message}`;
  }

  return logMessage;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  defaultMeta: { service: "TaskMinder" },
  transports: []
});

if (process.env.NODE_ENV !== "PRODUCTION") {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      customFormat
    )
  }));
} 
else {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      customFormat
    )
  }));
}

export default logger;