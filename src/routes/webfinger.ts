import { db } from "$lib/db";
import { parseJSON } from "$lib/utils";
import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
	let resource = c.req.query("resource");

	if (!resource || !resource.includes("acct:")) {
		c.status(404);
		return c.text(
			'Bad request. Please make sure "acct:USER@DOMAIN" is what you are sending as the "resource" query parameter.'
		);
	} else {
		let name = resource.replace("acct:", "");

		let result = db.prepare("select webfinger from accounts where name = ?").get(name);
		if (result === undefined) {
			c.status(404);
			return c.text(`No record found for ${name}.`);
		} else {
			return c.json(parseJSON(result?.webfinger));
		}
	}
});

export default app;
