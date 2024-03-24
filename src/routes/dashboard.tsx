import { Hono } from "hono";
import { html } from "hono/html";

const app = new Hono();

app.get("/", (c) => {
	return c.html(
		<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<title>Admin Page</title>

				{html`
					<style>
						body {
							font-family: sans-serif;
							font-size: 1.2rem;
							margin: 2rem;
						}
						form {
							max-width: 900px;
							display: flex;
							flex-direction: column;
							gap: 0.5rem;
							margin-block: 1rem;
						}
						form > * {
							margin: 0;
						}
					</style>
				`}
			</head>
			<body>
				<h1>Admin Page</h1>

				<form method="POST" action="/api/admin/create">
					<h2>Create Account</h2>
					<p>
						Create a new ActivityPub Actor (account). Requires the admin user/pass on
						submit.
					</p>

					<input type="text" name="username" placeholder="my-username" />

					<button type="submit">Create Account</button>
				</form>

				<form method="POST" action="/api/sendMessage">
					<h2>Send Message To Followers</h2>
					<p>
						Enter an account name, its API key, and a message. This message will send to
						all its followers.
					</p>
					<input type="text" name="username" placeholder="my-username" />

					<input type="text" name="apiKey" placeholder="1234567890abcdef" />

					<input type="text" name="message" placeholder="Hello there." />

					<button type="submit">Send Message</button>
				</form>
			</body>
		</html>
	);
});

export default app;
