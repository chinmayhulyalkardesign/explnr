import path from "node:path";
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    // `prisma generate` loads this config too, but needs no DB connection —
    // use plain process.env (undefined, not throwing) so `generate` never
    // fails just because DATABASE_URL/DIRECT_URL aren't set yet. A command
    // that actually needs to connect (migrate dev/deploy) will fail on its
    // own, with a clearer error, if the URL turns out to be missing.
    //
    // Migrations run DDL, which shouldn't go through a transaction-mode
    // pooler (pgbouncer) — prefer the direct connection when one is set.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
