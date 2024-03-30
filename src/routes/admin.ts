import { accounts, db } from "$lib/db";
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

	if (!username) {
		c.status(400);
		return c.json({
			msg: 'Bad request. Please make sure "username" is a property in the POST body.',
		});
	}

	// create keypair
	const { pubKey, privKey } = await new Promise<{ pubKey: string; privKey: string }>(
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
				(err: Error, pubKey: string, privKey: string) => {
					if (err) rej(err);

					res({ pubKey, privKey });
				}
			);
		}
	);

	const apiKey: string = crypto.randomBytes(16).toString("hex");

	try {
		db.insert(accounts).values({
			username: username.toString(),
			apiKey,
			privKey,
			pubKey,
		});

		c.status(200);
		return activityJson({ msg: "ok", apiKey });
	} catch (e) {
		c.status(200);
		return activityJson({ error: e });
	}
});

export default app;
