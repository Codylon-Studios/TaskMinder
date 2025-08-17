import { PrismaClient, Prisma } from "@prisma/client";
import pg from "pg";

// Make PostgreSQL BIGINT (OID 20) return a JS number instead of a string
pg.types.setTypeParser(20, val => parseInt(val, 10));


const developmentLogLevels: Prisma.LogLevel[] = ["query", "info", "warn", "error"];
const productionLogLevels: Prisma.LogLevel[] = ["warn", "error"];

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "DEVELOPMENT" 
    ? developmentLogLevels 
    : productionLogLevels
});
export default prisma;
