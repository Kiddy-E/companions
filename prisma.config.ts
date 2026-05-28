import { defineConfig } from "prisma/config";

// Load .env for local dev — silently skipped in Docker (env vars already injected)
try {
  await import("dotenv/config");
} catch {
  // dotenv not available or no .env file — that's fine in production
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
