import { accounts, followers } from "astro:db";

export type Account = typeof accounts.$inferSelect;
export type Follower = typeof followers.$inferSelect;
