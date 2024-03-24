import { db } from "$lib/db";
import { parseJSON } from "$lib/utils";
import { Context, Hono } from "hono";
import crypto from "node:crypto";
import config from "../../config.json";

const { DOMAIN } = config;

const app = new Hono();

async function signAndSend(message, username: string, privKey: string, targetDomain: string) {
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
	body: Record<string, any>,
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
	};

	await signAndSend(message, username, privKey, targetDomain);
}

app.post("/", async (c) => {
	// pass in a name for an account, if the account doesn't exist, create it!
	const body = await c.req.json();
	const { actor, object, type } = body;

	console.log("body", body);

	const myURL = new URL(actor);
	let targetDomain = myURL.hostname;

	// TODO: add "Undo" follow event
	if (typeof object === "string" && type === "Follow") {
		let username = object.replace(`https://${DOMAIN}/u/`, "");

		// Add the user to the DB of accounts that follow the account
		// get the followers JSON for the user
		let result = db
			.prepare("select priv_key, followers from accounts where username = ?")
			.get(username);

		if (!result) {
			c.status(404);
			return c.text(`No record found for ${username}.`);
		} else {
			await sendAcceptMessage(body, username, result?.priv_key, targetDomain);

			// update followers
			let followers = parseJSON(result?.followers || "[]");

			if (followers) {
				followers.push(actor);
				// unique items
				followers = [...new Set(followers)];
			} else {
				followers = [actor];
			}

			let followersText = JSON.stringify(followers);

			// Update into DB
			db.prepare("update accounts set followers=? where username = ?").run(
				followersText,
				username
			);

			return c.text("Updated followers!");
		}
	}
});

export default app;
