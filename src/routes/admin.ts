import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import crypto from "node:crypto";
import config from "../../config.json";
import { db } from "$lib/db";

const { DOMAIN } = config;

const app = new Hono();

// app.use(
// 	"*",
// 	basicAuth({
// 		username: USER,
// 		password: PASS,
// 	})
// );

function createActor(name: string, pubkey: string) {
	return {
		"@context": ["https://www.w3.org/ns/activitystreams", "https://w3id.org/security/v1"],

		id: `https://${DOMAIN}/u/${name}`,
		type: "Person",
		preferredUsername: `${name}`,
		inbox: `https://${DOMAIN}/api/inbox`,
		outbox: `https://${DOMAIN}/u/${name}/outbox`,
		followers: `https://${DOMAIN}/u/${name}/followers`,

		publicKey: {
			id: `https://${DOMAIN}/u/${name}#main-key`,
			owner: `https://${DOMAIN}/u/${name}`,
			publicKeyPem: pubkey,
		},
	};
}

function createWebfinger(name: string) {
	return {
		subject: `acct:${name}@${DOMAIN}`,

		links: [
			{
				rel: "self",
				type: "application/activity+json",
				href: `https://${DOMAIN}/u/${name}`,
			},
		],
	};
}

app.post("/create", async (c) => {
	// pass in a name for an account, if the account doesn't exist, create it!
	const { account } = await c.req.json();

	if (account === undefined) {
		c.status(400);
		return c.json({
			msg: 'Bad request. Please make sure "account" is a property in the POST body.',
		});
	}

	// create keypair
	const { publicKey, privateKey } = await new Promise<{ publicKey: string; privateKey: string }>(
		(res, rej) => {
			crypto.generateKeyPair(
				"rsa",
				{
					modulusLength: 4096,
					publicKeyEncoding: {
						type: "spki",
						format: "pem",
					},
					privateKeyEncoding: {
						type: "pkcs8",
						format: "pem",
					},
				},
				(err: Error, publicKey: string, privateKey: string) => {
					if (err) rej(err);

					res({ publicKey, privateKey });
				}
			);
		}
	);

	let actorRecord = createActor(account, publicKey);
	let webfingerRecord = createWebfinger(account);
	const apikey = crypto.randomBytes(16).toString("hex");

	try {
		db.prepare(
			"insert or replace into accounts(name, actor, apikey, pubkey, privkey, webfinger) values(?, ?, ?, ?, ?, ?)"
		).run(
			`${account}@${DOMAIN}`,
			JSON.stringify(actorRecord),
			apikey,
			publicKey,
			privateKey,
			JSON.stringify(webfingerRecord)
		);

		c.status(200);
		return c.json({ msg: "ok", apikey });
	} catch (e) {
		c.status(200);
		return c.json({ error: e });
	}
});

export default app;
