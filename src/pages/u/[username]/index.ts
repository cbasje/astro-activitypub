import { activityJson, html, text } from "$lib/response";
import { toFullMention } from "$lib/utils";
import * as AP from "@activity-kit/types";
import type { APIRoute } from "astro";
import { accounts, db, eq } from "astro:db";

const createActor = (username: string, pubKey: string) => {
	return {
		"@context": [
			new URL("https://www.w3.org/ns/activitystreams"),
			new URL("https://w3id.org/security/v1"),
		],

		id: `https://${DOMAIN}/u/${username}`,
		type: "Person",
		preferredUsername: `${username}`,
		inbox: `https://${DOMAIN}/api/inbox`,
		outbox: `https://${DOMAIN}/u/${username}/outbox`,
		followers: `https://${DOMAIN}/u/${username}/followers`,

		publicKey: {
			id: `https://${DOMAIN}/u/${username}#main-key`,
			owner: `https://${DOMAIN}/u/${username}`,
			publicKeyPem: pubKey,
		},
	} satisfies AP.Actor;
};

export const GET: APIRoute = async ({ params, request }) => {
	const { username } = params;

	if (!username) return text("Bad request.", 400);

	const [result] = await db
		.select({
			pubKey: accounts.pubKey,
		})
		.from(accounts)
		.where(eq(accounts.username, username))
		.limit(1);

	if (!result) return text(`No record found for ${toFullMention(username)}.`, 404);

	const showJson = request.headers.get("Accept")?.startsWith("application/");

	if (!showJson) return html("Hello <b>HTML</b>!");

	return activityJson(createActor(username, result.pubKey));
};
