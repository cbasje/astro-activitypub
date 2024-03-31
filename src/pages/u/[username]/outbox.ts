import { activityJson, text } from "$lib/response";
import { messageEndpoint, userEndpoint } from "$lib/utils";
import * as AP from "@activity-kit/types";
import type { APIRoute } from "astro";
import { db, eq, messages } from "astro:db";

export const GET: APIRoute = async ({ params }) => {
	const { username } = params;

	if (!username) return text("Bad request.", 400);

	const outboxEndpoint = new URL("outbox", userEndpoint(username));
	const paginationEndpoint = new URL(outboxEndpoint);
	paginationEndpoint.searchParams.set("page", "1");

	const result = await db.select().from(messages).where(eq(messages.account, username));

	let outboxCollection = {
		"@context": [new URL("https://www.w3.org/ns/activitystreams")],
		type: "OrderedCollection",
		totalItems: result.length,
		id: outboxEndpoint,
		first: {
			type: "OrderedCollectionPage",
			totalItems: result.length,
			partOf: outboxEndpoint,
			orderedItems: result.map((m) => messageEndpoint(m.guid)),
			id: paginationEndpoint,
		},
	} satisfies AP.OrderedCollection;
	return activityJson(outboxCollection);
};
