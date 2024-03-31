import { jrdJson, text } from "$lib/response";
import { toFullMention, toUsername, userEndpoint } from "$lib/utils";
import { APIRoute } from "astro";
import { accounts, db, eq } from "astro:db";

const createWebfinger = (username: string) => {
	const endpoint = userEndpoint(username);

	return {
		subject: `acct:${toFullMention(username)}`,

		aliases: [endpoint],

		links: [
			{
				rel: "self",
				type: "application/activity+json",
				href: endpoint,
			},
			{
				rel: "http://webfinger.net/rel/profile-page",
				type: "text/html",
				href: endpoint,
			},
			{
				rel: "http://webfinger.net/rel/avatar",
				type: "image/png",
				href: "https://media.mas.to/accounts/avatars/109/772/734/566/866/469/original/94d402ddf59e1507.png",
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

	return jrdJson(createWebfinger(username));
};
