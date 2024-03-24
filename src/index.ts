import { db } from "$lib/db";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import config from "../config.json";
import admin from "./routes/admin";
import api from "./routes/api";
import inbox from "./routes/inbox";
import message from "./routes/message";
import user from "./routes/user";
import webfinger from "./routes/webfinger";

const { PORT } = config;

// if there is no `accounts` table in the DB, create an empty table
db.prepare(
	"CREATE TABLE IF NOT EXISTS accounts (username TEXT PRIMARY KEY, priv_key TEXT, pub_key TEXT, api_key TEXT, followers TEXT, messages TEXT)"
).run();
// if there is no `messages` table in the DB, create an empty table
db.prepare("CREATE TABLE IF NOT EXISTS messages (guid TEXT PRIMARY KEY, message TEXT)").run();

const app = new Hono();

app.use("*", cors());

app.get("/", (c) => c.text("Hello Bun!"));
app.get("/admin", serveStatic({ path: "./static/admin/index.html" }));
app.options("/api");
app.route("/api", api);
app.route("/api/admin", admin);
app.route("/.well-known/webfinger", webfinger);
app.route("/u", user);
app.route("/m", message);
app.route("/api/inbox", inbox);

export default {
	port: PORT,
	fetch: app.fetch,
};
