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
	if (input.startsWith("https://"))
		return { username: input.replace(`https://${DOMAIN}/u/`, ""), domain: undefined };

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

export const toFullMention = (username: string) => {
	if (username.includes("@")) return username;
	else return `${username}@${DOMAIN}`;
};
