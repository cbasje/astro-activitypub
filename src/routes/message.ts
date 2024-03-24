import { db } from "$lib/db";
import { parseJSON } from "$lib/utils";
import { Hono } from "hono";

const app = new Hono();

app.get("/:guid", (c) => {
	const guid = c.req.param("guid");

	if (!guid) {
		c.status(400);
		return c.text("Bad request.");
	} else {
		let result = db.prepare("select message from messages where guid = ?").get(guid);

		if (!result) {
			c.status(404);
			return c.text(`No record found for ${guid}.`);
		} else {
			return c.json(parseJSON(result?.message));
		}
	}
});

export default app;
