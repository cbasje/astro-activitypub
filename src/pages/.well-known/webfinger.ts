import { APIRoute } from "astro";
import { toUsername, toFullMention, userEndpoint } from "$lib/utils";
import { activityJson, text } from "$lib/response";
import { db, accounts, eq } from "astro:db";

const createWebfinger = (username: string) => {
	return {
		subject: `acct:${toFullMention(username)}`,

		links: [
			{
				rel: "http://webfinger.net/rel/profile-page",
				type: "text/html",
				href: userEndpoint(username),
			},
			{
				rel: "self",
				type: "application/activity+json",
				href: userEndpoint(username),
			},
		],
	};
};

export const GET: APIRoute = async ({ url }) => {
	const resource = url.searchParams.get("resource");
	const { username } = toUsername(resource ?? "");
	console.log(resource, username);

	if (!resource || !resource.includes("acct:") || !username)
		return text(
			'Bad request. Please make sure "acct:USER@DOMAIN" is what you are sending as the "resource" query parameter.',
			404
		);

	const [result] = await db
		.select({
			username: accounts.username,
		})
		.from(accounts)
		.where(eq(accounts.username, username))
		.limit(1);

	if (!result) return text(`No record found for ${username}.`, 404);

	return activityJson(createWebfinger(username));
};
