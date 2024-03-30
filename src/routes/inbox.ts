import { accounts, db } from "$lib/db";
import { AcceptMessage, FollowMessage } from "$lib/types";
import { toUsername } from "$lib/utils";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import crypto from "node:crypto";
import config from "../../config.json";

const { DOMAIN } = config;

const app = new Hono();

async function signAndSend(
	message: AcceptMessage,
	username: string,
	privKey: string,
	targetDomain: string
) {
	// get the URI of the actor object and append 'inbox' to it
	let inbox = message.object.actor + "/inbox";
	let inboxFragment = inbox.replace("https://" + targetDomain, "");
	// get the private key

	const digestHash = crypto.createHash("sha256").update(JSON.stringify(message)).digest("base64");

	const signer = crypto.createSign("sha256");
	let d = new Date();

	let stringToSign = `(request-target): post ${inboxFragment}\nhost: ${targetDomain}\ndate: ${d.toUTCString()}\ndigest: SHA-256=${digestHash}`;
	signer.update(stringToSign);
	signer.end();
	const signature = signer.sign(privKey);
	const signature_b64 = signature.toString("base64");

	let header = `keyId="https://${DOMAIN}/u/${username}",headers="(request-target) host date digest",signature="${signature_b64}"`;

	await fetch(inbox, {
		headers: {
			Host: targetDomain,
			Date: d.toUTCString(),
			Digest: `SHA-256=${digestHash}`,
			Signature: header,
		},
		method: "POST",
		body: JSON.stringify(message),
	});
}

async function sendAcceptMessage(
	body: FollowMessage,
	username: string,
	privKey: string,
	targetDomain: string
) {
	const guid = crypto.randomBytes(16).toString("hex");

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

	const targetDomain = new URL(actor).hostname;

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
