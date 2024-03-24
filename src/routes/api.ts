import { db } from "$lib/db";
import { parseJSON, toAccount } from "$lib/utils";
import { Context, Hono } from "hono";
import crypto from "node:crypto";
import config from "../../config.json";

const { DOMAIN } = config;

const app = new Hono();

app.post("/sendMessage", async (c) => {
	const { username, apiKey, message } = await c.req.json();

	// check to see if your API key matches
	let result = db.prepare("select api_key from accounts where username = ?").get(username);

	if (result?.api_key === apiKey) {
		sendCreateMessage(message, username, c);
	} else {
		c.status(403);
		return c.json({ msg: "Invalid API key" });
	}
});

async function signAndSend(message, username: string, targetDomain: string, inbox: string) {
	// get the private key
	let inboxFragment = inbox.replace("https://" + targetDomain, "");

	let result = db.prepare("select priv_key from accounts where username = ?").get(username);

	if (!result) {
		console.log(`No record found for ${username}.`);
	} else {
		const digestHash = crypto
			.createHash("sha256")
			.update(JSON.stringify(message))
			.digest("base64");

		let d = new Date();
		let stringToSign = `(request-target): post ${inboxFragment}\nhost: ${targetDomain}\ndate: ${d.toUTCString()}\ndigest: SHA-256=${digestHash}`;

		const signer = crypto.createSign("sha256");
		signer.update(stringToSign);
		signer.end();
		const signature = signer.sign(result?.priv_key);
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
}

function createMessage(text: string, username: string, follower) {
	const guidCreate = crypto.randomBytes(16).toString("hex");
	const guidNote = crypto.randomBytes(16).toString("hex");

	let d = new Date();

	let noteMessage = {
		id: `https://${DOMAIN}/m/${guidNote}`,
		type: "Note",
		published: d.toISOString(),
		attributedTo: `https://${DOMAIN}/u/${username}`,
		content: text,
		to: ["https://www.w3.org/ns/activitystreams#Public"],
	};

	let createMessage = {
		"@context": "https://www.w3.org/ns/activitystreams",

		id: `https://${DOMAIN}/m/${guidCreate}`,
		type: "Create",
		actor: `https://${DOMAIN}/u/${username}`,
		to: ["https://www.w3.org/ns/activitystreams#Public"],
		cc: [follower],

		object: noteMessage,
	};

	db.prepare("insert or replace into messages(guid, message) values(?, ?)").run(
		guidCreate,
		JSON.stringify(createMessage)
	);
	db.prepare("insert or replace into messages(guid, message) values(?, ?)").run(
		guidNote,
		JSON.stringify(noteMessage)
	);

	return createMessage;
}

function sendCreateMessage(text: string, username: string, c: Context) {
	let result = db.prepare("select followers from accounts where username = ?").get(username);

	let followers = parseJSON(result?.followers);

	if (!followers || followers.length === 0) {
		c.status(400);
		return c.json({ msg: `No followers for account ${toAccount(username)}` });
	} else {
		for (let follower of followers) {
			let inbox = follower + "/inbox";
			let myURL = new URL(follower);
			let targetDomain = myURL.host;
			let message = createMessage(text, username, follower);
			signAndSend(message, username, targetDomain, inbox);
		}

		c.status(200);
		return c.json({ msg: "ok" });
	}
}

export default app;
