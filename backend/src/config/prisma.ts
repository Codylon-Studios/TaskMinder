import { PrismaClient } from "../prisma/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { envConfig } from "./env.js";

const adapter = new PrismaPg({
  connectionString: envConfig.databaseUrl
});

export const prisma = new PrismaClient({ adapter });