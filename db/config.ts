import { column, defineDb, defineTable } from "astro:db";

const accounts = defineTable({
	columns: {
		username: column.text({ primaryKey: true }),
		name: column.text({ optional: true }),
		privKey: column.text(),
		pubKey: column.text(),
		apiKey: column.text(),
		followers: column.json({ optional: true }),
	},
});

const messages = defineTable({
	columns: {
		guid: column.text({ primaryKey: true }),
		message: column.json(),
		account: column.text({ references: () => accounts.columns.username }),
	},
});

// https://astro.build/db/config
export default defineDb({
	tables: { accounts, messages },
});
