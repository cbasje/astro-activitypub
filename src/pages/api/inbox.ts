import { randomBytes } from "$lib/crypto";
import { json, text } from "$lib/response";
import { signAndSend } from "$lib/send";
import type { Follower } from "$lib/types";
import { messageEndpoint, toUsername, userEndpoint } from "$lib/utils";
import * as AP from "@activity-kit/types";
import type { APIRoute } from "astro";
import { accounts, db, and, eq, followers } from "astro:db";

async function createAcceptMessage(body: AP.Follow, username: string) {
	const guid = await randomBytes(16);

	let message = {
		"@context": new URL("https://www.w3.org/ns/activitystreams"),

		id: messageEndpoint(guid),
		type: "Accept",
		actor: userEndpoint(username),

		object: body,
	} satisfies AP.Accept;

	return message;
}

async function getFollowerDetails(actor: AP.EntityReference) {
	const response = await fetch(actor.toString(), {
		headers: {
			Accept: "application/activity+json",
		},
	});
	if (!response.ok) throw new Error(`Not able to access follower details: ${actor.toString()}`);

	const data = (await response.json()) as AP.Actor;

	return {
		id: data.id!.toString(),
		inbox: data.inbox.toString(),
		sharedInbox: data.endpoints?.sharedInbox?.toString() ?? null,
	} satisfies Follower;
}

async function follow(body: AP.Follow) {
	const { username } = toUsername(body.object?.toString());

	const [result] = await db
		.select({
			privKey: accounts.privKey,
		})
		.from(accounts)
		.where(eq(accounts.username, username ?? ""))
		.limit(1);

	if (!result) throw new Error(`No record found for ${username}.`); // TODO: 404

	let message = await createAcceptMessage(body, username!);

	let actor = await getFollowerDetails(Array.isArray(body.actor) ? body.actor[0] : body.actor);
	if (!actor || !actor.inbox) throw new Error("No follower details found");

	await signAndSend(message, username!, result.privKey, actor.inbox);

	// Add to the DB
	await db.insert(followers).values({
		...actor,
		account: username!,
	});
}

async function unfollow(body: AP.Follow) {
	const { username } = toUsername(body.object?.toString());

	if (!username) throw new Error(`No record found for ${username}.`); // TODO: 404

	let actor = Array.isArray(body.actor) ? body.actor[0] : body.actor;

	// Delete from the DB
	await db
		.delete(followers)
		.where(and(eq(followers.id, actor.toString()), eq(followers.account, username!)));
}

export const POST: APIRoute = async ({ request }) => {
	const body = (await request.json()) as AP.Activity;

	console.log("body ~ api/inbox", body);

	try {
		if (body.type === "Follow") {
			await follow(body as AP.Follow);

			return text("Added follow!");
		}

		if (body.type === "Undo" && body.object?.type === "Follow") {
			await unfollow(body.object as AP.Follow);

			return text("Deleted follow!");
		}
	} catch (e) {
		return json({ msg: e.message }, 500);
	}

	return text("Not supported yet!", 501);

	// Types:
	// When someone is thrown off the servers
	// {
	//  "@context": "https://www.w3.org/ns/activitystreams",
	//  id: "https://mastodon.social/users/cemudes#delete",
	//  type: "Delete",
	//  actor: "https://mastodon.social/users/cemudes",
	//  to: [ "https://www.w3.org/ns/activitystreams#Public" ],
	//  object: "https://mastodon.social/users/cemudes",
	//  signature: {
	//  type: "RsaSignature2017",
	//  creator: "https://mastodon.social/users/cemudes#main-key",
	//  created: "2024-04-01T13:18:09Z",
	//  signatureValue: "...",
	//  },
	// }

	// {
	//  "@context": "https://www.w3.org/ns/activitystreams",
	//  id: "https://mastodon.social/users/cbasje/statuses/112196229254568378/activity",
	//  type: "Announce",
	//  actor: "https://mastodon.social/users/cbasje",
	//  published: "2024-04-01T13:36:35Z",
	//  to: [ "https://www.w3.org/ns/activitystreams#Public" ],
	//  cc: [ "https://social.benjami.in/u/sebas/", "https://mastodon.social/users/cbasje/followers"
	//  ],
	//  object: "https://social.benjami.in/m/421b639f759505663c6723bad2677386/",
	// }

	// {
	// "@context": "https://www.w3.org/ns/activitystreams",
	// id: "https://mastodon.social/users/cbasje#likes/151995814",
	// type: "Like",
	// actor: "https://mastodon.social/users/cbasje",
	// object: "https://social.benjami.in/m/421b639f759505663c6723bad2677386/",
	// }
};
