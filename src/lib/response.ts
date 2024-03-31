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

export const json = (input: string | unknown, status = 200, contentType?: string) => {
	let body: string;

	if (typeof input === "string") body = JSON.stringify(parseJSON(input));
	else body = JSON.stringify(input);

	return new Response(body, {
		status,
		headers: {
			"Content-Type": contentType || "application/json",
		},
	});
};

export const jrdJson = (input: string | unknown, status = 200) => {
	return json(input, status, "application/jrd+json; charset=utf-8");
};

export const activityJson = (input: string | unknown, status = 200) => {
	return json(input, status, "application/activity+json; charset=utf-8");
};
