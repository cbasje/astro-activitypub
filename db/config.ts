import { NOW, column, defineDb, defineTable } from "astro:db";

const accounts = defineTable({
	columns: {
		username: column.text({ primaryKey: true }),
		name: column.text({ optional: true }),
		privKey: column.text(),
		pubKey: column.text(),
		apiKey: column.text(),
		createdAt: column.date({ default: NOW }),
	},
});

const messages = defineTable({
	columns: {
		guid: column.text({ primaryKey: true }),
		message: column.json(),
		account: column.text({ references: () => accounts.columns.username }),
		createdAt: column.date({ default: NOW }),
	},
});

const followers = defineTable({
	columns: {
		id: column.text({ primaryKey: true }),
		inbox: column.text(),
		sharedInbox: column.text({ optional: true }),
		account: column.text({ references: () => accounts.columns.username }),
	},
	// TODO: add index
});

// https://astro.build/db/config
export default defineDb({
	tables: { accounts, messages, followers },
});
