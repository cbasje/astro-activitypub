export const parseJSON = (text: string) => {
	try {
		return JSON.parse(text);
	} catch (e) {
		return null;
	}
};

export const toUsername = (input: string | undefined) => {
	if (!input) return { username: undefined, domain: undefined };

	input = input.replace(/https:\/\/|acct:/gi, "");
	console.log("⌨️", input);

	if (input.includes("@")) {
		const [username, domain] = input.split("@");
		return {
			username,
			domain,
		};
	} else if (input.includes("/u/")) {
		const [domain, username] = input.split("/u/");
		return {
			username: username.replace("/", ""),
			domain,
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

export const messageEndpoint = (guid: string) => new URL(`/m/${guid}/`, import.meta.env.SITE);
export const userEndpoint = (username: string) => new URL(`/u/${username}/`, import.meta.env.SITE);
