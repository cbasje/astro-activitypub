import { db } from "$lib/db";
import { parseJSON } from "$lib/utils";
import { Hono } from "hono";
import config from "../../config.json";

const { DOMAIN } = config;

const app = new Hono();

app.get("/:username", (c) => {
	const username = c.req.param("username");

	if (!username) {
		c.status(400);
		return c.text("Bad request.");
	} else {
		const account = `${username}@${DOMAIN}`;

		let result = db.prepare("select actor from accounts where name = ?").get(account);

		if (result === undefined) {
			c.status(404);
			return c.text(`No record found for ${account}.`);
		} else {
			let tempActor = parseJSON(result?.actor || "{}");
			// Added this followers URI for Pleroma compatibility, see https://github.com/dariusk/rss-to-activitypub/issues/11#issuecomment-471390881
			// New Actors should have this followers URI but in case of migration from an old version this will add it in on the fly
			if (tempActor.followers === undefined) {
				tempActor.followers = `https://${DOMAIN}/u/${username}/followers`;
			}
			return c.json(tempActor);
		}
	}
});

app.get("/:name/followers", (c) => {
	const name = c.req.param("name");

	if (!name) {
		c.status(400);
		return c.text("Bad request.");
	} else {
		let result = db
			.prepare("select followers from accounts where name = ?")
			.get(`${name}@${DOMAIN}`);
		console.log(result);

		let followers = parseJSON(result?.followers || "[]");
		let followersCollection = {
			type: "OrderedCollection",
			totalItems: followers.length,
			id: `https://${DOMAIN}/u/${name}/followers`,
			first: {
				type: "OrderedCollectionPage",
				totalItems: followers.length,
				partOf: `https://${DOMAIN}/u/${name}/followers`,
				orderedItems: followers,
				id: `https://${DOMAIN}/u/${name}/followers?page=1`,
			},
			"@context": ["https://www.w3.org/ns/activitystreams"],
		};
		return c.json(followersCollection);
	}
});

app.get("/:name/outbox", (c) => {
	const name = c.req.param("name");

	if (!name) {
		c.status(400);
		return c.text("Bad request.");
	} else {
		let messages: string[] = [];

		let outboxCollection = {
			type: "OrderedCollection",
			totalItems: messages.length,
			id: `https://${DOMAIN}/u/${name}/outbox`,
			first: {
				type: "OrderedCollectionPage",
				totalItems: messages.length,
				partOf: `https://${DOMAIN}/u/${name}/outbox`,
				orderedItems: messages,
				id: `https://${DOMAIN}/u/${name}/outbox?page=1`,
			},
			"@context": ["https://www.w3.org/ns/activitystreams"],
		};
		return c.json(outboxCollection);
	}
});

export default app;
