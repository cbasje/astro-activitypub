import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { Message } from "./types";

export const accounts = sqliteTable("accounts", {
	username: text("id").primaryKey(),
	privKey: text("priv_key").notNull(),
	pubKey: text("pub_key").notNull(),
	apiKey: text("api_key").notNull(),
	followers: text("followers", { mode: "json" }).$type<string[]>(),
	messages: text("messages").$type<string[]>(),
});

export const messages = sqliteTable("messages", {
	guid: text("id").primaryKey(),
	message: text("message", { mode: "json" }).$type<Message>().notNull(),
});

const sqlite = new Database("sqlite.db");
export const db = drizzle(sqlite);
