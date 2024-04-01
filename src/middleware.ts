import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async ({ url, request }, next) => {
	const endpoint = await next();

	console.log("🚦", request.method, url.pathname, endpoint.status);

	return endpoint;
});
