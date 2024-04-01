import { randomBytes } from "$lib/crypto";
import { json, text } from "$lib/response";
import { signAndSend } from "$lib/send";
import type { Follower } from "$lib/types";
import { messageEndpoint, toUsername, userEndpoint } from "$lib/utils";
import * as AP from "@activity-kit/types";
import type { APIRoute } from "astro";
import { accounts, db, eq } from "astro:db";

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
				followers: accounts.followers,
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

			// FIXME: remove this
			const followers = (result.followers || []) as Follower[];
			followers.push(newFollower);

			// Update into DB
			await db
				.update(accounts)
				.set({ followers: [...new Set(followers)] })
				.where(eq(accounts.username, username!));

			return text("Updated followers!");
		} catch (e) {
			return json({ msg: e.message }, 500);
		}
	} else {
		return text("Not supported yet!", 501);
	}
};
