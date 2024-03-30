import { db } from "$lib/db";
import { activityJson } from "$lib/utils";
import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import crypto from "node:crypto";

const app = new Hono();

// app.use(
// 	"*",
// 	basicAuth({
// 		username: USER,
// 		password: PASS,
// 	})
// );

app.post("/create", async (c) => {
	// Pass in a username for an account, if the account doesn't exist, create it!
	const formData = await c.req.formData();
	const username = formData.get("username");

	if (username === undefined) {
		c.status(400);
		return c.json({
			msg: 'Bad request. Please make sure "username" is a property in the POST body.',
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

	const apiKey = crypto.randomBytes(16).toString("hex");

	try {
		db.prepare(
			"insert or replace into accounts(username, api_key, pub_key, priv_key) values(?, ?, ?, ?)"
		).run(username, apiKey, publicKey, privateKey);

		c.status(200);
		return activityJson({ msg: "ok", apiKey });
	} catch (e) {
		c.status(200);
		return activityJson({ error: e });
	}
});

export default app;
