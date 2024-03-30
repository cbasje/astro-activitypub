import admin from "$routes/admin";
import api from "$routes/api";
import dashboard from "$routes/dashboard";
import inbox from "$routes/inbox";
import message from "$routes/message";
import user from "$routes/user";
import webfinger from "$routes/webfinger";
import { Hono } from "hono";
import { cors } from "hono/cors";
import config from "../config.json";

const { PORT } = config;

const app = new Hono();

app.use("*", cors());

app.get("/", (c) => c.text("Hello Bun!"));
app.options("/api");
app.route("/admin", dashboard);
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
