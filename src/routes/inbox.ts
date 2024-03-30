import { accounts, db } from "$lib/db";
import { AcceptMessage, FollowMessage } from "$lib/types";
import { getHttpSignature, randomBytes } from "$lib/crypto";
import { toUsername } from "$lib/utils";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import config from "../../config.json";

const { DOMAIN } = config;

const app = new Hono();

async function signAndSend(
	message: AcceptMessage,
	username: string,
	privKey: string,
	targetDomain: URL
) {
	const inbox = message.object.actor + "/inbox";

	const { dateHeader, digestHeader, signatureHeader } = await getHttpSignature(
		targetDomain,
		new URL(`https://${DOMAIN}/u/${username}`),
		privKey,
		message
	);

	await fetch(inbox, {
		headers: {
			Host: targetDomain.toString(),
			Date: dateHeader,
			Digest: digestHeader,
			Signature: signatureHeader,
		},
		method: "POST",
		body: JSON.stringify(message),
	});
}

async function sendAcceptMessage(
	body: FollowMessage,
	username: string,
	privKey: string,
	targetDomain: URL
) {
	const guid = await randomBytes(16);

	let message = {
		"@context": "https://www.w3.org/ns/activitystreams",
		id: `https://${DOMAIN}/${guid}`,
		type: "Accept",
		actor: `https://${DOMAIN}/u/${username}`,
		object: body,
	} satisfies AcceptMessage;

	await signAndSend(message, username, privKey, targetDomain);
}

app.post("/", async (c) => {
	// pass in a name for an account, if the account doesn't exist, create it!
	const body = await c.req.json<FollowMessage>();
	const { actor, object, type } = body;

	console.log("body", body);

	const targetDomain = new URL(actor);

	// TODO: add "Undo" follow event
	if (typeof object === "string" && type === "Follow") {
		const { username } = toUsername(object);

		const [result] = await db
			.select({
				privKey: accounts.privKey,
				followers: accounts.followers,
			})
			.from(accounts)
			.where(eq(accounts.username, username ?? ""))
			.limit(1);

		if (!result) {
			c.status(404);
			return c.text(`No record found for ${username}.`);
		} else {
			await sendAcceptMessage(body, username!, result.privKey, targetDomain);

			// update followers
			let followers = result.followers;

			if (followers) {
				followers.push(actor);
				// unique items
				followers = [...new Set(followers)];
			} else {
				followers = [actor];
			}

			// Update into DB
			db.update(accounts).set({ followers }).where(eq(accounts.username, username!));

			return c.text("Updated followers!");
		}
	}
});

export default app;
