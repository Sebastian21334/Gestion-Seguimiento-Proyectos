import { index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { teams } from "@/modules/teams/schema";
import { users } from "@/modules/users/schema";

export const teamInvitations = pgTable(
  "team_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 254 }).notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("invitations_email_idx").on(table.email),
    index("invitations_team_idx").on(table.teamId),
  ],
);
