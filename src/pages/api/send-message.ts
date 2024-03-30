import { getHttpSignature, randomBytes } from "$lib/crypto";
import { json } from "$lib/response";
import type { Account } from "$lib/types";
import { toFullMention } from "$lib/utils";
import * as AP from "@activity-kit/types";
import type { APIRoute } from "astro";
import { accounts, and, db, eq, messages } from "astro:db";

async function signAndSend(message: AP.Entity, account: Account, targetDomain: URL, inbox: string) {
	const { dateHeader, digestHeader, signatureHeader } = await getHttpSignature(
		targetDomain,
		new URL(`https://${DOMAIN}/u/${account.username}`),
		account.privKey,
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

async function createMessage(text: string, username: string, follower: string) {
	const guidCreate: string = await randomBytes(16);
	const guidNote: string = await randomBytes(16);

	let d = new Date();

	let noteMessage = {
		id: new URL(`https://${DOMAIN}/m/${guidNote}`),
		type: "Note",
		published: d.toISOString(),
		attributedTo: `https://${DOMAIN}/u/${username}`,
		content: text,
		to: ["https://www.w3.org/ns/activitystreams#Public"],
	} satisfies AP.Note;

	let createMessage = {
		"@context": "https://www.w3.org/ns/activitystreams",

		id: `https://${DOMAIN}/m/${guidCreate}`,
		type: "Create",
		actor: `https://${DOMAIN}/u/${username}`,
		to: ["https://www.w3.org/ns/activitystreams#Public"],
		cc: [follower],

		object: noteMessage,
	} satisfies AP.Create;

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
		let targetDomain = new URL(follower);
		let message = await createMessage(text, account.username, follower);
		await signAndSend(message, account, targetDomain, inbox);
	}
}

export const POST: APIRoute = async ({ request }) => {
	const formData = await request.formData();
	const username = formData.get("username");
	const apiKey = formData.get("apiKey");
	const message = formData.get("message");

	if (!username || !apiKey || !message) {
		return json({ msg: "Bad request." }, 400);
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

	if (!result) return json({ msg: "Invalid API key" }, 400);

	try {
		await sendCreateMessage(message.toString(), result);

		return json({ msg: "ok" });
	} catch (e) {
		return json({ msg: e.message }, 400);
	}
};
