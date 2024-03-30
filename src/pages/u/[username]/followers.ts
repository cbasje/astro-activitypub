import { activityJson, text } from "$lib/response";
import { userEndpoint } from "$lib/utils";
import * as AP from "@activity-kit/types";
import type { APIRoute } from "astro";
import { accounts, db, eq } from "astro:db";

export const GET: APIRoute = async ({ params }) => {
	const { username } = params;

	if (!username) return text("Bad request.", 400);
	const endpoint = userEndpoint(username);

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
		id: new URL("/followers", endpoint),
		first: {
			type: "OrderedCollectionPage",
			totalItems: result.followers?.length || 0,
			partOf: new URL("/followers", endpoint),
			orderedItems: result.followers || [],
			id: new URL("/followers?page=1", endpoint),
		},
	} satisfies AP.OrderedCollection;
	return activityJson(followersCollection);
};
