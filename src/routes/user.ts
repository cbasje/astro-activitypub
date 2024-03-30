import { db } from "$lib/db";
import { activityJson, parseJSON, toAccount } from "$lib/utils";
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

app.get("/:username", (c) => {
	const username = c.req.param("username");

	if (!username) {
		c.status(400);
		return c.text("Bad request.");
	} else {
		let result = db.prepare("select pub_key from accounts where username = ?").get(username);

		if (!result) {
			c.status(404);
			return c.text(`No record found for ${toAccount(username)}.`);
		}

		const showJson = c.req.header("Accept")?.startsWith("application/");

		if (!showJson) {
			return c.html("Hello <b>HTML</b>!");
		}

		return activityJson(createActor(username, result?.pub_key));
	}
});

app.get("/:username/followers", (c) => {
	const username = c.req.param("username");

	if (!username) {
		c.status(400);
		return c.text("Bad request.");
	} else {
		let result = db.prepare("select followers from accounts where username = ?").get(username);
		console.log(result);

		let followers = parseJSON(result?.followers || "[]");
		let followersCollection = {
			type: "OrderedCollection",
			totalItems: followers.length,
			id: `https://${DOMAIN}/u/${username}/followers`,
			first: {
				type: "OrderedCollectionPage",
				totalItems: followers.length,
				partOf: `https://${DOMAIN}/u/${username}/followers`,
				orderedItems: followers,
				id: `https://${DOMAIN}/u/${username}/followers?page=1`,
			},
			"@context": ["https://www.w3.org/ns/activitystreams"],
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
			"@context": ["https://www.w3.org/ns/activitystreams"],
		};
		return activityJson(outboxCollection);
	}
});

export default app;
