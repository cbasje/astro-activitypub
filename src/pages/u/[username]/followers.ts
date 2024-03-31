import { activityJson, text } from "$lib/response";
import { userEndpoint } from "$lib/utils";
import * as AP from "@activity-kit/types";
import type { APIRoute } from "astro";
import { accounts, db, eq } from "astro:db";

export const GET: APIRoute = async ({ params }) => {
	const { username } = params;

	if (!username) return text("Bad request.", 400);

	const followersEndpoint = new URL("followers", userEndpoint(username));
	const paginationEndpoint = new URL(followersEndpoint);
	paginationEndpoint.searchParams.set("page", "1");

	const [result] = await db
		.select({
			followers: accounts.followers,
		})
		.from(accounts)
		.where(eq(accounts.username, username))
		.limit(1);

	let followersCollection = {
		"@context": [new URL("https://www.w3.org/ns/activitystreams")],
		type: "OrderedCollection",
		totalItems: result.followers?.length || 0,
		id: followersEndpoint,
		first: {
			type: "OrderedCollectionPage",
			totalItems: result.followers?.length || 0,
			partOf: followersEndpoint,
			orderedItems: result.followers || [],
			id: paginationEndpoint,
		},
	} satisfies AP.OrderedCollection;
	return activityJson(followersCollection);
};
