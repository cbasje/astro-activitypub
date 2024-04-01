import { accounts } from "astro:db";

export type Account = typeof accounts.$inferSelect;

export type Follower = {
	id: URL;
	inbox: URL;
	sharedInbox: URL | undefined;
};
