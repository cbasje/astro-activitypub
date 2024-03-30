export const parseJSON = (text: string) => {
	try {
		return JSON.parse(text);
	} catch (e) {
		return null;
	}
};

const accountRegex = /^(?:acct:)?@?(?<username>\w+)@?(?<domain>[A-z0-9\-\.]+)?$/g;
export const toUsername = (input: string) => {
	if (input.startsWith("https://"))
		return { username: new URL(input).pathname, domain: undefined };

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
	else return `${username}@${new URL(import.meta.env.SITE).hostname}`;
};

export const messageEndpoint = (guid: string) => new URL(`/m/${guid}`, import.meta.env.SITE);
export const userEndpoint = (username: string) => new URL(`/u/${username}`, import.meta.env.SITE);
