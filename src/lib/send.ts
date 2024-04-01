import * as AP from "@activity-kit/types";
import { getHttpSignature } from "./crypto";
import { userEndpoint } from "./utils";
import type { Follower } from "./types";

export async function signAndSend(
	message: AP.Entity,
	username: string,
	privKey: string,
	inbox: URL
) {
	const { dateHeader, digestHeader, signatureHeader } = await getHttpSignature(
		inbox,
		userEndpoint(username),
		privKey,
		message
	);

	await fetch(inbox, {
		headers: {
			Host: inbox.hostname.toString(),
			Date: dateHeader,
			Digest: digestHeader!,
			Signature: signatureHeader,
		},
		method: "POST",
		body: JSON.stringify(message),
	});
}

export async function signAndSendToFollowers(
	message: AP.Entity,
	username: string,
	privKey: string,
	followers: Follower[]
) {
	if (!followers || followers.length === 0) return;

	for await (let f of followers) {
		let inbox = new URL(f.sharedInbox || f.inbox);
		await signAndSend(message, username, privKey, inbox);
	}
}
