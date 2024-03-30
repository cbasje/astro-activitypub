import { activityJson, text } from "$lib/response";
import type { APIRoute } from "astro";
import { accounts, db, eq } from "astro:db";

export const GET: APIRoute = async ({ params }) => {
	const { username } = params;

	if (!username) return text("Bad request.", 400);

	const [result] = await db
		.select({
			followers: accounts.followers,
		})
		.from(accounts)
		.where(eq(accounts.username, username))
		.limit(1);

	let followersCollection = {
		"@context": ["https://www.w3.org/ns/activitystreams"],
		type: "OrderedCollection",
		totalItems: result.followers?.length || 0,
		id: `https://${DOMAIN}/u/${username}/followers`,
		first: {
			type: "OrderedCollectionPage",
			totalItems: result.followers?.length || 0,
			partOf: `https://${DOMAIN}/u/${username}/followers`,
			orderedItems: result.followers || [],
			id: `https://${DOMAIN}/u/${username}/followers?page=1`,
		},
	};
	return activityJson(followersCollection);
};
