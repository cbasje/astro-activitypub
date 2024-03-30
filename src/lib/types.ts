import { accounts } from "astro:db";

export type Account = typeof accounts.$inferSelect;
