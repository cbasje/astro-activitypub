import { text } from "$lib/response";
import * as AP from "@activity-kit/types";
import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request }) => {
	const body = (await request.json()) as AP.Activity;

	console.log("body ~ [username]/inbox", body);

	return text("Not supported yet!", 501);
};
