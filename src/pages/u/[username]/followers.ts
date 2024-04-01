import { activityJson, text } from "$lib/response";
import type { Follower } from "$lib/types";
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

	// FIXME: remove this
	const followers = (result.followers || []) as Follower[];

	let followersCollection = {
		"@context": [new URL("https://www.w3.org/ns/activitystreams")],
		type: "OrderedCollection",
		totalItems: followers.length,
		id: followersEndpoint,
		first: {
			type: "OrderedCollectionPage",
			totalItems: followers.length,
			partOf: followersEndpoint,
			orderedItems: followers.map((f) => f.id),
			id: paginationEndpoint,
		},
	} satisfies AP.OrderedCollection;
	return activityJson(followersCollection);
};
