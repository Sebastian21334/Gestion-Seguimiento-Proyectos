import { index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const authRateLimits = pgTable(
  "auth_rate_limits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: varchar("key", { length: 150 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("rate_limits_key_time_idx").on(table.key, table.createdAt)],
);
