import { db } from "$lib/db";
import { accounts } from "$lib/schema";
import { activityJson, toFullMention, toUsername } from "$lib/utils";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import config from "../../config.json";

const { DOMAIN } = config;

const app = new Hono();

function createWebfinger(username: string) {
	return {
		subject: `acct:${toFullMention(username)}`,

		links: [
			{
				rel: "self",
				type: "application/activity+json",
				href: `https://${DOMAIN}/u/${username}`,
			},
		],
	};
}

app.get("/", async (c) => {
	let resource = c.req.query("resource");
	const { username } = toUsername(resource ?? "");

	if (!resource || !resource.includes("acct:") || !username) {
		c.status(404);
		return c.text(
			'Bad request. Please make sure "acct:USER@DOMAIN" is what you are sending as the "resource" query parameter.'
		);
	} else {
		const [result] = await db
			.select({
				username: accounts.username,
			})
			.from(accounts)
			.where(eq(accounts.username, username))
			.limit(1);

		if (!result) {
			c.status(404);
			return c.text(`No record found for ${username}.`);
		} else {
			return activityJson(createWebfinger(username));
		}
	}
});

export default app;
