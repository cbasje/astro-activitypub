import { activityJson, text } from "$lib/response";
import type { APIRoute } from "astro";
import { db, eq, messages } from "astro:db";

export const GET: APIRoute = async ({ params }) => {
	const { guid } = params;

	if (!guid) return text("Bad request.", 400);

	const [result] = await db
		.select({
			message: messages.message,
		})
		.from(messages)
		.where(eq(messages.guid, guid))
		.limit(1);

	if (!result) return text(`No record found for ${guid}.`, 404);

	return activityJson(result.message);
};
