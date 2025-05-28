import { PrismaClient } from '@prisma/client';
import pg from "pg";

// Make PostgreSQL BIGINT (OID 20) return a JS number instead of a string
pg.types.setTypeParser(20, val => parseInt(val, 10));

const prisma = new PrismaClient();
export default prisma;