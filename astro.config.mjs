import { defineConfig } from "astro/config";
import bun from "./adapter/index";
import db from "@astrojs/db";

// https://astro.build/config
export default defineConfig({
	output: "server",
	adapter: bun({
		port: 3000,
	}),

	integrations: [db()],

	site: "https://social.benjami.in/",
});
