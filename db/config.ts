import { column, defineDb, defineTable } from "astro:db";

const accounts = defineTable({
	columns: {
		username: column.text({ primaryKey: true }),
		name: column.text({ optional: true }),
		privKey: column.text(),
		pubKey: column.text(),
		apiKey: column.text(),
		followers: column.json({ optional: true }),
		messages: column.text({ optional: true }),
	},
});

const messages = defineTable({
	columns: { guid: column.text({ primaryKey: true }), message: column.json() },
});

// https://astro.build/db/config
export default defineDb({
	tables: { accounts, messages },
});
