import { randomBytes } from "$lib/crypto";
import { json } from "$lib/response";
import { signAndSendToFollowers } from "$lib/send";
import { messageEndpoint, userEndpoint } from "$lib/utils";
import * as AP from "@activity-kit/types";
import type { APIRoute } from "astro";
import { accounts, and, db, eq, messages } from "astro:db";

async function createBoostMessage(link: URL, username: string) {
	const guid: string = await randomBytes(16);

	let d = new Date();

	let message = {
		id: messageEndpoint(guid),
		type: "Announce",
		published: d,
		actor: userEndpoint(username),

		object: link,

		to: [new URL("https://www.w3.org/ns/activitystreams#Public")],
		cc: [new URL("followers", userEndpoint(username))], // TODO: Add original poster
	} satisfies AP.Announce;

	await db.insert(messages).values([
		{
			guid,
			message,
			account: username,
			createdAt: d,
		},
	]);

	return {
		"@context": new URL("https://www.w3.org/ns/activitystreams"),
		...message,
	};
}

export const POST: APIRoute = async ({ request }) => {
	const formData = await request.formData();
	const username = formData.get("username");
	const apiKey = formData.get("apiKey");
	const link = formData.get("link");

	if (!username || !apiKey || !link) {
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
		let message = await createBoostMessage(new URL(link?.toString()), result.username);

		await signAndSendToFollowers(message, result.username, result.privKey, result.followers);

		return json({ msg: "ok" });
	} catch (e) {
		return json({ msg: e.message }, 400);
	}
};