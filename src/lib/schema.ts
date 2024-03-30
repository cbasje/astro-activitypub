import * as AP from "@activity-kit/types";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable("accounts", {
	username: text("username").primaryKey(),
	name: text("name"),
	privKey: text("priv_key").notNull(),
	pubKey: text("pub_key").notNull(),
	apiKey: text("api_key").notNull(),
	followers: text("followers", { mode: "json" }).$type<AP.EntityReference[]>(),
	messages: text("messages").$type<string[]>(),
});

export const messages = sqliteTable("messages", {
	guid: text("id").primaryKey(),
	message: text("message", { mode: "json" }).$type<AP.Entity>().notNull(),
});
