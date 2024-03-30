import { activityJson, text } from "$lib/response";
import { messageEndpoint, userEndpoint } from "$lib/utils";
import * as AP from "@activity-kit/types";
import type { APIRoute } from "astro";
import { db, eq, messages } from "astro:db";

export const GET: APIRoute = async ({ params }) => {
	const { username } = params;

	if (!username) return text("Bad request.", 400);
	const endpoint = userEndpoint(username);

	const result = await db.select().from(messages).where(eq(messages.account, username));

	let outboxCollection = {
		"@context": [new URL("https://www.w3.org/ns/activitystreams")],
		type: "OrderedCollection",
		totalItems: result.length,
		id: new URL("/outbox", endpoint),
		first: {
			type: "OrderedCollectionPage",
			totalItems: result.length,
			partOf: new URL("/outbox", endpoint),
			orderedItems: result.map((m) => new URL(m.guid, messageEndpoint(""))),
			id: new URL("/outbox?page=1", endpoint),
		},
	} satisfies AP.OrderedCollection;
	return activityJson(outboxCollection);
};
