import { randomBytes } from "$lib/crypto";
import { json, text } from "$lib/response";
import { signAndSend } from "$lib/send";
import type { Follower } from "$lib/types";
import { messageEndpoint, toUsername, userEndpoint } from "$lib/utils";
import * as AP from "@activity-kit/types";
import type { APIRoute } from "astro";
import { accounts, db, eq, followers } from "astro:db";

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
		id: data.id!,
		inbox: new URL(data.inbox.toString()),
		sharedInbox: data.endpoints?.sharedInbox ?? undefined,
	} satisfies Follower;
}

export const POST: APIRoute = async ({ request }) => {
	const body = (await request.json()) as AP.Follow;
	const { actor, object, type } = body;

	console.log("body", body);

	// TODO: add "Undo" follow event
	if (type === "Follow") {
		const { username } = toUsername(object.toString());

		const [result] = await db
			.select({
				privKey: accounts.privKey,
			})
			.from(accounts)
			.where(eq(accounts.username, username ?? ""))
			.limit(1);

		if (!result) return text(`No record found for ${username}.`, 404);

		try {
			let message = await createAcceptMessage(body, username!);

			let newFollower = await getFollowerDetails(Array.isArray(actor) ? actor[0] : actor);
			if (!newFollower || !newFollower.inbox) throw new Error("No follower details found");

			await signAndSend(message, username!, result.privKey, newFollower.inbox);

			// Add to the DB
			await db.insert(followers).values({
				id: newFollower.id.toString(),
				inbox: newFollower.inbox.toString(),
				sharedInbox: newFollower.sharedInbox?.toString() ?? undefined,
				account: username!,
			});

			return text("Updated followers!");
		} catch (e) {
			return json({ msg: e.message }, 500);
		}
	} else {
		return text("Not supported yet!", 501);
	}

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

	// Undo Follow
	// {
	// "@context": "https://www.w3.org/ns/activitystreams",
	//  id: "https://mas.to/users/sebastiaan#follows/6377183/undo",
	//  type: "Undo",
	//  actor: "https://mas.to/users/sebastiaan",
	//  object: {
	//  id: "https://mas.to/71c022c1-692f-4b89-a2d7-2b8777c9a570",
	//  type: "Follow",
	//  actor: "https://mas.to/users/sebastiaan",
	//  object: "https://social.benjami.in/u/sebas/",
	//  },
	//  }

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
