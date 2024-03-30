import { accounts, db, messages } from "$lib/db";
import { Account, Message } from "$lib/types";
import { toFullMention } from "$lib/utils";
import { and, eq } from "drizzle-orm";
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

	if (!username || !apiKey || !message) {
		c.status(400);
		return c.json({ msg: "Bad request." });
	}

	// check to see if your API key matches
	const [result] = await db
		.select()
		.from(accounts)
		.where(
			and(
				eq(accounts.username, username?.toString()),
				eq(accounts.apiKey, apiKey?.toString())
			)
		)
		.limit(1);

	if (result) {
		try {
			await sendCreateMessage(message.toString(), result);

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

async function signAndSend(
	message: Message,
	account: Account,
	targetDomain: string,
	inbox: string
) {
	// get the private key
	let inboxFragment = inbox.replace("https://" + targetDomain, "");

	const digestHash = crypto.createHash("sha256").update(JSON.stringify(message)).digest("base64");

	let d = new Date();
	let stringToSign = `(request-target): post ${inboxFragment}\nhost: ${targetDomain}\ndate: ${d.toUTCString()}\ndigest: SHA-256=${digestHash}`;

	const signer = crypto.createSign("sha256").update(stringToSign).end();
	const signature = signer.sign(account.privKey);
	const signature_b64 = signature.toString("base64");

	let header = `keyId="https://${DOMAIN}/u/${account.username}",headers="(request-target) host date digest",signature="${signature_b64}"`;

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

async function createMessage(text: string, username: string, follower: string) {
	const guidCreate: string = crypto.randomBytes(16).toString("hex");
	const guidNote: string = crypto.randomBytes(16).toString("hex");

	let d = new Date();

	let noteMessage = {
		id: `https://${DOMAIN}/m/${guidNote}`,
		type: "Note",
		published: d.toISOString(),
		attributedTo: `https://${DOMAIN}/u/${username}`,
		content: text,
		to: ["https://www.w3.org/ns/activitystreams#Public"],
	} satisfies Message;

	let createMessage = {
		"@context": "https://www.w3.org/ns/activitystreams",

		id: `https://${DOMAIN}/m/${guidCreate}`,
		type: "Create",
		actor: `https://${DOMAIN}/u/${username}`,
		to: ["https://www.w3.org/ns/activitystreams#Public"],
		cc: [follower],

		object: noteMessage,
	} satisfies Message;

	await db.insert(messages).values([
		{
			guid: guidCreate,
			message: createMessage,
		},
		{
			guid: guidNote,
			message: noteMessage,
		},
	]);

	return createMessage;
}

async function sendCreateMessage(text: string, account: Account) {
	if (!account.followers || account.followers.length === 0)
		throw new Error(`No followers for account ${toFullMention(account.username)}`);

	for await (let follower of account.followers) {
		let inbox = follower + "/inbox";
		let myURL = new URL(follower);
		let targetDomain = myURL.host;
		let message = await createMessage(text, account.username, follower);
		await signAndSend(message, account, targetDomain, inbox);
	}
}

export default app;
