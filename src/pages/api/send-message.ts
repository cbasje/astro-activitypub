import { randomBytes } from "$lib/crypto";
import { json } from "$lib/response";
import { signAndSendToFollowers } from "$lib/send";
import { messageEndpoint, userEndpoint } from "$lib/utils";
import * as AP from "@activity-kit/types";
import type { APIRoute } from "astro";
import { accounts, and, db, eq, messages } from "astro:db";

async function createMessage(text: string, username: string) {
	const guidCreate: string = await randomBytes(16);
	const guidNote: string = await randomBytes(16);

	let d = new Date();

	// TODO: add mentions in cc
	// TODO: add inReplyTo

	// Public: (sent to sharedInbox)
	// to: [https://www.w3.org/ns/activitystreams#Public]
	// cc: [https://.../followers]
	// Unlisted (sent to sharedInbox)
	// to: [https://.../followers]
	// cc: [https://www.w3.org/ns/activitystreams#Public]
	// Followers (sent to sharedInbox)
	// to: [https://.../followers]
	// cc: []
	// Mentioned (sent to sharedInbox by Mastodon but should be personal inbox)
	// to: [https://.../inbox]
	// cc: []

	let noteMessage = {
		id: messageEndpoint(guidNote),
		type: "Note",
		summary: undefined,
		published: d,
		attributedTo: userEndpoint(username),

		sensitive: false,
		content: text,

		to: [new URL("https://www.w3.org/ns/activitystreams#Public")],
		cc: [new URL("followers", userEndpoint(username))],
	} satisfies AP.Note;

	let createMessage = {
		id: messageEndpoint(guidCreate),
		type: "Create",
		actor: userEndpoint(username),
		published: d,

		object: noteMessage,

		to: noteMessage.to,
		cc: noteMessage.cc,
	} satisfies AP.Create;

	await db.insert(messages).values([
		{
			guid: guidCreate,
			message: createMessage,
			account: username,
			createdAt: d,
		},
	]);

	return {
		"@context": [
			new URL("https://www.w3.org/ns/activitystreams"),
			{ sensitive: "as:sensitive" },
		],
		...createMessage,
	};
}

export const POST: APIRoute = async ({ request }) => {
	const formData = await request.formData();
	const username = formData.get("username");
	const apiKey = formData.get("apiKey");
	const text = formData.get("text");

	if (!username || !apiKey || !text) {
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
		let message = await createMessage(text?.toString(), result.username);

		await signAndSendToFollowers(message, result.username, result.privKey, result.followers);

		return json({ msg: "ok" });
	} catch (e) {
		return json({ msg: e.message }, 400);
	}
};
