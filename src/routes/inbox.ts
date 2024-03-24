import { db } from "$lib/db";
import { parseJSON, toAccount } from "$lib/utils";
import { Context, Hono } from "hono";
import crypto from "node:crypto";
import config from "../../config.json";

const { DOMAIN } = config;

const app = new Hono();

async function signAndSend(message, username: string, c: Context, targetDomain: string) {
	// get the URI of the actor object and append 'inbox' to it
	let inbox = message.object.actor + "/inbox";
	let inboxFragment = inbox.replace("https://" + targetDomain, "");
	// get the private key

	let result = db.prepare("select privkey from accounts where name = ?").get(toAccount(username));

	if (result === undefined) {
		c.status(404);
		return c.text(`No record found for ${username}.`);
	} else {
		let privkey = result?.privkey;
		const digestHash = crypto
			.createHash("sha256")
			.update(JSON.stringify(message))
			.digest("base64");

		const signer = crypto.createSign("sha256");
		let d = new Date();

		let stringToSign = `(request-target): post ${inboxFragment}\nhost: ${targetDomain}\ndate: ${d.toUTCString()}\ndigest: SHA-256=${digestHash}`;
		signer.update(stringToSign);
		signer.end();
		const signature = signer.sign(privkey);
		const signature_b64 = signature.toString("base64");

		let header = `keyId="https://${DOMAIN}/u/${username}",headers="(request-target) host date digest",signature="${signature_b64}"`;

		await fetch(inbox, {
			headers: {
				Host: targetDomain,
				Date: d.toUTCString(),
				Digest: `SHA-256=${digestHash}`,
				Signature: header,
			},
			method: "POST",
			body: JSON.stringify(message),
		});
	}
}

function sendAcceptMessage(
	body: Record<string, any>,
	username: string,
	c: Context,
	targetDomain: string
) {
	const guid = crypto.randomBytes(16).toString("hex");

	let message = {
		"@context": "https://www.w3.org/ns/activitystreams",
		id: `https://${DOMAIN}/${guid}`,
		type: "Accept",
		actor: `https://${DOMAIN}/u/${username}`,
		object: body,
	};
	signAndSend(message, username, c, targetDomain);
}

app.post("/", async (c) => {
	// pass in a name for an account, if the account doesn't exist, create it!
	const body = await c.req.json();
	const { actor, object, type } = body;

	const myURL = new URL(actor);
	let targetDomain = myURL.hostname;

	// TODO: add "Undo" follow event
	if (typeof object === "string" && type === "Follow") {
		let username = object.replace(`https://${DOMAIN}/u/`, "");
		sendAcceptMessage(body, username, c, targetDomain);

		// Add the user to the DB of accounts that follow the account
		// get the followers JSON for the user
		let result = db
			.prepare("select followers from accounts where name = ?")
			.get(toAccount(username));

		if (result === undefined) {
			console.log(`No record found for ${username}.`);
		} else {
			// update followers
			let followers = parseJSON(result?.followers || "[]");

			if (followers) {
				followers.push(actor);
				// unique items
				followers = [...new Set(followers)];
			} else {
				followers = [actor];
			}

			let followersText = JSON.stringify(followers);
			try {
				// update into DB
				let newFollowers = db
					.prepare("update accounts set followers=? where name = ?")
					.run(followersText, toAccount(username));
				console.log("updated followers!", newFollowers);
			} catch (e) {
				console.log("error", e);
			}
		}
	}
});

export default app;
