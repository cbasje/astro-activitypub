import { activityJson, text } from "$lib/response";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ params }) => {
	const { username } = params;

	if (!username) return text("Bad request.", 400);

	let messages: string[] = [];

	let outboxCollection = {
		"@context": ["https://www.w3.org/ns/activitystreams"],
		type: "OrderedCollection",
		totalItems: messages.length,
		id: `https://${DOMAIN}/u/${username}/outbox`,
		first: {
			type: "OrderedCollectionPage",
			totalItems: messages.length,
			partOf: `https://${DOMAIN}/u/${username}/outbox`,
			orderedItems: messages,
			id: `https://${DOMAIN}/u/${username}/outbox?page=1`,
		},
	};
	return activityJson(outboxCollection);
};
