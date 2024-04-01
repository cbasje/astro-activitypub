import { activityJson, text } from "$lib/response";
import { userEndpoint } from "$lib/utils";
import * as AP from "@activity-kit/types";
import type { APIRoute } from "astro";
import { db, eq, followers } from "astro:db";

export const GET: APIRoute = async ({ params }) => {
	const { username } = params;

	if (!username) return text("Bad request.", 400);

	const followersEndpoint = new URL("followers", userEndpoint(username));
	const paginationEndpoint = new URL(followersEndpoint);
	paginationEndpoint.searchParams.set("page", "1");

	const accountFollowers = await db
		.select()
		.from(followers)
		.where(eq(followers.account, username));

	let followersCollection = {
		"@context": [new URL("https://www.w3.org/ns/activitystreams")],
		type: "OrderedCollection",
		totalItems: accountFollowers.length,
		id: followersEndpoint,
		first: {
			type: "OrderedCollectionPage",
			totalItems: accountFollowers.length,
			partOf: followersEndpoint,
			orderedItems: accountFollowers.map((f) => new URL(f.id)),
			id: paginationEndpoint,
		},
	} satisfies AP.OrderedCollection;
	return activityJson(followersCollection);
};
