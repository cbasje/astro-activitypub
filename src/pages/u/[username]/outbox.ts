import { activityJson, text } from "$lib/response";
import { messageEndpoint, userEndpoint } from "$lib/utils";
import * as AP from "@activity-kit/types";
import type { APIRoute } from "astro";
import { count, db, eq, messages } from "astro:db";

const PAGE_SIZE = 10;

export const GET: APIRoute = async ({ params, url }) => {
	const { username } = params;
	const page = url.searchParams.get("page");
	const pageNumber = Number(page);

	if (!username) return text("Bad request.", 400);

	const outboxEndpoint = new URL("outbox", userEndpoint(username));
	const paginationEndpoint = new URL(outboxEndpoint);

	let outboxCollection: AP.OrderedCollection = {
		"@context": new URL("https://www.w3.org/ns/activitystreams"),
		id: outboxEndpoint,
		type: "OrderedCollection",
	};

	if (page === null || Number.isNaN(pageNumber)) {
		const [result] = await db
			.select({
				total: count(),
			})
			.from(messages)
			.where(eq(messages.account, username));
		outboxCollection["totalItems"] = result.total;

		paginationEndpoint.searchParams.set("page", "1");
		outboxCollection["first"] = new URL(paginationEndpoint);

		paginationEndpoint.searchParams.set("page", Math.ceil(result.total / PAGE_SIZE).toString());
		outboxCollection["last"] = new URL(paginationEndpoint);

		return activityJson(outboxCollection);
	}

	const result = await db
		.select()
		.from(messages)
		.where(eq(messages.account, username))
		.offset(pageNumber * PAGE_SIZE)
		.limit(PAGE_SIZE);

	outboxCollection["orderedItems"] = result.map((m) => m.message);

	paginationEndpoint.searchParams.set("page", page);
	outboxCollection["id"] = new URL(paginationEndpoint);

	paginationEndpoint.searchParams.set(
		"page",
		Math.max(pageNumber + 1, Math.ceil(result.length / PAGE_SIZE)).toString()
	);
	outboxCollection["next"] = new URL(paginationEndpoint);

	paginationEndpoint.searchParams.set("page", Math.min(0, pageNumber - 1).toString());
	outboxCollection["prev"] = new URL(paginationEndpoint);

	outboxCollection["partOf"] = outboxEndpoint;

	return activityJson(outboxCollection);
};
