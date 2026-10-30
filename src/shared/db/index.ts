import "server-only";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import { env } from "@/shared/config/env";

neonConfig.webSocketConstructor = ws;
const globalDb = globalThis as unknown as { neonPool?: Pool };
const pool =
  globalDb.neonPool ?? new Pool({ connectionString: env.DATABASE_URL, max: 5 });
if (env.NODE_ENV !== "production") globalDb.neonPool = pool;
export const db = drizzle(pool);
