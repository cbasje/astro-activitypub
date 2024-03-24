import { db } from "$lib/db";
import { toAccount, toUsername } from "$lib/utils";
import { Hono } from "hono";
import config from "../../config.json";

const { DOMAIN } = config;

const app = new Hono();

function createWebfinger(name: string) {
	return {
		subject: `acct:${toAccount(name)}`,

		links: [
			{
				rel: "self",
				type: "application/activity+json",
				href: `https://${DOMAIN}/u/${name}`,
			},
		],
	};
}

app.get("/", (c) => {
	let resource = c.req.query("resource");
	const { username } = toUsername(resource ?? "");

	if (!resource || !resource.includes("acct:") || !username) {
		c.status(404);
		return c.text(
			'Bad request. Please make sure "acct:USER@DOMAIN" is what you are sending as the "resource" query parameter.'
		);
	} else {
		let result = db.prepare("select name from accounts where name = ?").get(username);

		if (!result) {
			c.status(404);
			return c.text(`No record found for ${username}.`);
		} else {
			return c.json(createWebfinger(username));
		}
	}
});

export default app;
