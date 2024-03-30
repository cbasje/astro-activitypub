import { db } from "$lib/db";
import { activityJson, parseJSON, toAccount } from "$lib/utils";
import { Hono } from "hono";
import crypto from "node:crypto";
import config from "../../config.json";

const { DOMAIN } = config;

const app = new Hono();

app.post("/sendMessage", async (c) => {
	const formData = await c.req.formData();
	const username = formData.get("username");
	const apiKey = formData.get("apiKey");
	const message = formData.get("message");

	// check to see if your API key matches
	let result = db.prepare("select api_key from accounts where username = ?").get(username);

	if (result?.api_key === apiKey) {
		try {
			await sendCreateMessage(message, username);

			return c.json({ msg: "ok" });
		} catch (e) {
			c.status(400);
			return c.json({ msg: e.message });
		}
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

		const signer = crypto.createSign("sha256").update(stringToSign).end();
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

async function sendCreateMessage(text: string, username: string) {
	let result = db.prepare("select followers from accounts where username = ?").get(username);

	let followers = parseJSON(result?.followers);

	if (!followers || followers.length === 0)
		throw new Error(`No followers for account ${toAccount(username)}`);

	for await (let follower of followers) {
		let inbox = follower + "/inbox";
		let myURL = new URL(follower);
		let targetDomain = myURL.host;
		let message = createMessage(text, username, follower);
		await signAndSend(message, username, targetDomain, inbox);
	}
}

export default app;
