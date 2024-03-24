import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import crypto from "node:crypto";
import config from "../../config.json";
import { db } from "$lib/db";
import { toAccount } from "$lib/utils";

const { DOMAIN } = config;

const app = new Hono();

// app.use(
// 	"*",
// 	basicAuth({
// 		username: USER,
// 		password: PASS,
// 	})
// );

app.post("/create", async (c) => {
	// pass in a name for an account, if the account doesn't exist, create it!
	const { username } = await c.req.json();

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

	const apikey = crypto.randomBytes(16).toString("hex");

	try {
		db.prepare(
			"insert or replace into accounts(name, apikey, pubkey, privkey) values(?, ?, ?, ?)"
		).run(toAccount(username), apikey, publicKey, privateKey);

		c.status(200);
		return c.json({ msg: "ok", apikey });
	} catch (e) {
		c.status(200);
		return c.json({ error: e });
	}
});

export default app;
