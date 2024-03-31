import { activityJson, html, text } from "$lib/response";
import type { Account } from "$lib/types";
import { toFullMention, userEndpoint } from "$lib/utils";
import * as AP from "@activity-kit/types";
import type { APIRoute } from "astro";
import { accounts, db, eq } from "astro:db";

const createActor = (account: Partial<Account>, pubKey: string) => {
	const endpoint = userEndpoint(account.username ?? "");

	return {
		"@context": [
			new URL("https://www.w3.org/ns/activitystreams"),
			new URL("https://w3id.org/security/v1"),
		],

		id: endpoint,
		type: "Person",
		preferredUsername: account.name ?? undefined,
		inbox: new URL("/api/inbox", import.meta.env.SITE),
		outbox: new URL("/outbox", endpoint),
		followers: new URL("/followers", endpoint),

		publicKey: {
			id: endpoint.toString() + "#main-key",
			owner: endpoint.toString(),
			publicKeyPem: pubKey,
		},
	} satisfies AP.Actor;
};

export const GET: APIRoute = async ({ params, request }) => {
	const { username } = params;

	if (!username) return text("Bad request.", 400);

	const [result] = await db
		.select({
			name: accounts.name,
			username: accounts.username,
			pubKey: accounts.pubKey,
		})
		.from(accounts)
		.where(eq(accounts.username, username))
		.limit(1);

	if (!result) return text(`No record found for ${toFullMention(username)}.`, 404);

	const showJson = request.headers.get("Accept")?.startsWith("application/");

	if (!showJson) return html("Hello <b>HTML</b>!");

	return activityJson(createActor(result, result.pubKey));
};