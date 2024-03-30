import { getHttpSignature, randomBytes } from "$lib/crypto";
import { text } from "$lib/response";
import { toUsername, userEndpoint } from "$lib/utils";
import * as AP from "@activity-kit/types";
import type { APIRoute } from "astro";
import { accounts, db, eq } from "astro:db";

async function signAndSend(
	message: AP.Accept,
	username: string,
	privKey: string,
	targetDomain: URL
) {
	const inbox = message.object.actor + "/inbox";

	const { dateHeader, digestHeader, signatureHeader } = await getHttpSignature(
		targetDomain,
		userEndpoint(username),
		privKey,
		message
	);

	await fetch(inbox, {
		headers: {
			Host: targetDomain.toString(),
			Date: dateHeader,
			Digest: digestHeader!,
			Signature: signatureHeader,
		},
		method: "POST",
		body: JSON.stringify(message),
	});
}

async function sendAcceptMessage(
	body: AP.Follow,
	username: string,
	privKey: string,
	targetDomain: URL
) {
	const guid = await randomBytes(16);

	let message = {
		"@context": "https://www.w3.org/ns/activitystreams",
		id: new URL(guid, import.meta.env.SITE),
		type: "Accept",
		actor: userEndpoint(username),
		object: body,
	} satisfies AP.Accept;

	await signAndSend(message, username, privKey, targetDomain);
}

export const POST: APIRoute = async ({ request }) => {
	const body = (await request.json()) as AP.Follow;
	const { actor, object, type } = body;

	console.log("body", body);

	const targetDomain = new URL(actor);

	// TODO: add "Undo" follow event
	if (type === "Follow") {
		const { username } = toUsername(object);

		const [result] = await db
			.select({
				privKey: accounts.privKey,
				followers: accounts.followers,
			})
			.from(accounts)
			.where(eq(accounts.username, username ?? ""))
			.limit(1);

		if (!result) return text(`No record found for ${username}.`, 404);

		await sendAcceptMessage(body, username!, result.privKey, targetDomain);

		// update followers
		let followers = result.followers;

		if (followers) {
			followers.push(actor);
			// unique items
			followers = [...new Set(followers)];
		} else {
			followers = [actor];
		}

		// Update into DB
		await db.update(accounts).set({ followers }).where(eq(accounts.username, username!));

		return text("Updated followers!");
	} else {
		return text("Not supported yet!", 405);
	}
};
