export const parseJSON = (text: string) => {
	try {
		return JSON.parse(text);
	} catch (e) {
		return null;
	}
};

const accountRegex = /^(?:acct:)?@?(?<username>\w+)@?(?<domain>[A-z0-9\-\.]+)?$/g;
const urlRegex = /^https:\/\/(?<domain>[A-z0-9\-\.]+)\/u\/(?<username>\w+)?/g;
export const toUsername = (input: string) => {
	let matches: RegExpExecArray | null;
	if (input.startsWith("https://")) matches = urlRegex.exec(input);
	else matches = accountRegex.exec(input);

	console.log("⌨️", input, typeof input, input.replace("acct:", "").split("@")[0], matches);

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
