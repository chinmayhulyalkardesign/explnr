import path from "node:path";
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    // Migrations run DDL, which shouldn't go through a transaction-mode
    // pooler (pgbouncer) — use the direct connection when one is set,
    // falling back to DATABASE_URL for a plain (unpooled) local Postgres.
    url: process.env.DIRECT_URL ? env("DIRECT_URL") : env("DATABASE_URL"),
  },
});
