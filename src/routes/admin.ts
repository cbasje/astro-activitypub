import { generateKeyPair, randomBytes } from "$lib/crypto";
import { db } from "$lib/db";
import { accounts } from "$lib/schema";
import { activityJson } from "$lib/utils";
import { Hono } from "hono";

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

	const keyPair = await generateKeyPair();
	const apiKey = await randomBytes(16);

	try {
		db.insert(accounts).values({
			username: username.toString(),
			apiKey,
			pubKey: keyPair.publicKey,
			privKey: keyPair.privateKey,
		});

		c.status(200);
		return activityJson({ msg: "ok", apiKey });
	} catch (e) {
		c.status(200);
		return activityJson({ error: e });
	}
});

export default app;
