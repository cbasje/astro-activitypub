import config from "../../config.json";

const { DOMAIN } = config;

export const parseJSON = (text: string) => {
	try {
		return JSON.parse(text);
	} catch (e) {
		return null;
	}
};

const accountRegex = /^(?:acct:)?(?<username>\w+)@?(?<domain>[A-z0-9\-\.]+)?$/g;
export const toUsername = (input: string) => {
	const matches = accountRegex.exec(input);

	if (matches && matches.groups && matches.groups["username"]) {
		return {
			username: matches.groups["username"],
			domain: matches.groups["domain"] ?? undefined,
		};
	}

	return {
		username: undefined,
		domain: undefined,
	};
};

export const toAccount = (username: string) => {
	if (username.includes("@")) return username;
	else return `${username}@${DOMAIN}`;
};

export const activityJson = (json: string | unknown) => {
	let body: string;

	if (typeof json === "string") body = JSON.stringify(parseJSON(json));
	else body = JSON.stringify(json);

	return new Response(body, {
		status: 200,
		headers: {
			"Content-Type": "application/activity+json",
		},
	});
};
