import path from "node:path";
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join("backend", "src", "prisma", "schema.prisma"),
  migrations: {
    path: path.join("backend", "src", "prisma", "migrations")
  }
});