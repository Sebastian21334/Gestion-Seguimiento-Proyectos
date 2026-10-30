import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";
import { envSchema } from "./src/shared/config/env-schema";

loadEnvConfig(process.cwd());
const env = envSchema.parse(process.env);
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/shared/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: env.DATABASE_URL },
  strict: true,
});
