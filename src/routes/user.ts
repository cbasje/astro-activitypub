import { accounts, db } from "$lib/db";
import { activityJson, toFullMention } from "$lib/utils";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import config from "../../config.json";

const { DOMAIN } = config;

const app = new Hono();

function createActor(username: string, pubKey: string) {
	return {
		"@context": ["https://www.w3.org/ns/activitystreams", "https://w3id.org/security/v1"],

		id: `https://${DOMAIN}/u/${username}`,
		type: "Person",
		preferredUsername: `${username}`,
		inbox: `https://${DOMAIN}/api/inbox`,
		outbox: `https://${DOMAIN}/u/${username}/outbox`,
		followers: `https://${DOMAIN}/u/${username}/followers`,

		publicKey: {
			id: `https://${DOMAIN}/u/${username}#main-key`,
			owner: `https://${DOMAIN}/u/${username}`,
			publicKeyPem: pubKey,
		},
	};
}

app.get("/:username", async (c) => {
	const username = c.req.param("username");

	if (!username) {
		c.status(400);
		return c.text("Bad request.");
	} else {
		const [result] = await db
			.select({
				pubKey: accounts.pubKey,
			})
			.from(accounts)
			.where(eq(accounts.username, username))
			.limit(1);

		if (!result) {
			c.status(404);
			return c.text(`No record found for ${toFullMention(username)}.`);
		}

		const showJson = c.req.header("Accept")?.startsWith("application/");

		if (!showJson) {
			return c.html("Hello <b>HTML</b>!");
		}

		return activityJson(createActor(username, result.pubKey));
	}
});

app.get("/:username/followers", async (c) => {
	const username = c.req.param("username");

	if (!username) {
		c.status(400);
		return c.text("Bad request.");
	} else {
		const [result] = await db
			.select({
				followers: accounts.followers,
			})
			.from(accounts)
			.where(eq(accounts.username, username))
			.limit(1);

		let followersCollection = {
			"@context": ["https://www.w3.org/ns/activitystreams"],
			type: "OrderedCollection",
			totalItems: result.followers?.length || 0,
			id: `https://${DOMAIN}/u/${username}/followers`,
			first: {
				type: "OrderedCollectionPage",
				totalItems: result.followers?.length || 0,
				partOf: `https://${DOMAIN}/u/${username}/followers`,
				orderedItems: result.followers || [],
				id: `https://${DOMAIN}/u/${username}/followers?page=1`,
			},
		};
		return activityJson(followersCollection);
	}
});

app.get("/:username/outbox", (c) => {
	const username = c.req.param("username");

	if (!username) {
		c.status(400);
		return c.text("Bad request.");
	} else {
		let messages: string[] = [];

		let outboxCollection = {
			"@context": ["https://www.w3.org/ns/activitystreams"],
			type: "OrderedCollection",
			totalItems: messages.length,
			id: `https://${DOMAIN}/u/${username}/outbox`,
			first: {
				type: "OrderedCollectionPage",
				totalItems: messages.length,
				partOf: `https://${DOMAIN}/u/${username}/outbox`,
				orderedItems: messages,
				id: `https://${DOMAIN}/u/${username}/outbox?page=1`,
			},
		};
		return activityJson(outboxCollection);
	}
});

export default app;
