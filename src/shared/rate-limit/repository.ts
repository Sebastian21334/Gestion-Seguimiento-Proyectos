import "server-only";
import { and, count, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/shared/db";
import { authRateLimits } from "./schema";

export type Bucket = { key: string; limit: number; windowMs: number };
export async function reserve(buckets: Bucket[]) {
  return db.transaction(async (tx) => {
    // Orden estable para evitar deadlocks; el conteo y la reserva son atómicos.
    for (const key of buckets.map((bucket) => bucket.key).sort())
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`,
      );
    const now = new Date();
    await tx
      .delete(authRateLimits)
      .where(
        lt(authRateLimits.createdAt, new Date(now.getTime() - 86_400_000)),
      );
    for (const bucket of buckets) {
      const [row] = await tx
        .select({ total: count() })
        .from(authRateLimits)
        .where(
          and(
            eq(authRateLimits.key, bucket.key),
            gte(
              authRateLimits.createdAt,
              new Date(now.getTime() - bucket.windowMs),
            ),
          ),
        );
      if (row.total >= bucket.limit) return null;
    }
    return tx
      .insert(authRateLimits)
      .values(buckets.map((bucket) => ({ key: bucket.key })))
      .returning({ id: authRateLimits.id });
  });
}
export async function release(ids: string[]) {
  if (ids.length)
    await db.delete(authRateLimits).where(inArray(authRateLimits.id, ids));
}
