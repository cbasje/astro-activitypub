import { generateKeyPair, randomBytes } from "$lib/crypto";
import { activityJson, json } from "$lib/response";
import type { APIRoute } from "astro";
import { accounts, db } from "astro:db";

// Pass in a username for an account, if the account doesn't exist, create it!
export const POST: APIRoute = async ({ request }) => {
	const formData = await request.formData();
	const username = formData.get("username");

	if (!username)
		return json(
			{
				msg: 'Bad request. Please make sure "username" is a property in the POST body.',
			},
			400
		);

	const keyPair = await generateKeyPair();
	const apiKey = await randomBytes(16);

	try {
		await db.insert(accounts).values({
			username: username.toString(),
			apiKey,
			pubKey: keyPair.publicKey,
			privKey: keyPair.privateKey,
		});

		return activityJson({ msg: "ok", apiKey });
	} catch (e) {
		return activityJson({ error: e });
	}
};
