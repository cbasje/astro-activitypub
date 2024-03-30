import { parseJSON } from "./utils";

export const text = (text: string, status = 200) => {
	return new Response(text, {
		status,
	});
};

export const html = (text: string, status = 200) => {
	return new Response(text, {
		status,
		headers: {
			"Content-Type": "text/html",
		},
	});
};

export const json = (json: string | unknown, status = 200) => {
	return new Response(JSON.stringify(json), {
		status,
		headers: {
			"Content-Type": "application/json",
		},
	});
};

export const activityJson = (json: string | unknown, status = 200) => {
	let body: string;

	if (typeof json === "string") body = JSON.stringify(parseJSON(json));
	else body = JSON.stringify(json);

	return new Response(body, {
		status,
		headers: {
			"Content-Type": "application/activity+json; charset=utf-8",
		},
	});
};
