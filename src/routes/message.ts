import { db } from "$lib/db";
import { accounts } from "$lib/schema";
import { activityJson } from "$lib/utils";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

const app = new Hono();

app.get("/:guid", async (c) => {
	const guid = c.req.param("guid");

	if (!guid) {
		c.status(400);
		return c.text("Bad request.");
	} else {
		const [result] = await db
			.select({
				message: messages.message,
			})
			.from(messages)
			.where(eq(messages.guid, guid))
			.limit(1);

		if (!result) {
			c.status(404);
			return c.text(`No record found for ${guid}.`);
		} else {
			return activityJson(result.message);
		}
	}
});

export default app;
