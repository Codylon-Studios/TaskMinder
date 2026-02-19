import { PrismaClient, Prisma } from "@prisma/client";

const developmentLogLevels: Prisma.LogLevel[] = ["query", "info", "warn", "error"];
const productionLogLevels: Prisma.LogLevel[] = ["warn", "error"];

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "DEVELOPMENT" 
    ? developmentLogLevels 
    : productionLogLevels
});
export default prisma;
