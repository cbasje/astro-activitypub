import { accounts } from "./db";

export type Account = typeof accounts.$inferSelect;
