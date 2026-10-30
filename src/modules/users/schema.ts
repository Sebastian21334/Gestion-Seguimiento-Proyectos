import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 254 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  tokenVersion: integer("token_version").notNull().default(0),
  bio: varchar("bio", { length: 500 }),
  githubUsername: varchar("github_username", { length: 39 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
