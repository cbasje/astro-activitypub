import { accounts } from "./db";

export type Account = typeof accounts.$inferSelect;

export type NoteMessage = {
	id: `https://${string}`;
	type: "Note";
	published: string;
	attributedTo: string;
	content: string;
	to: `https://${string}`[];
};
export type CreateMessage = {
	"@context": "https://www.w3.org/ns/activitystreams";
	id: `https://${string}`;
	type: "Create";
	actor: `https://${string}`;
	to: string[];
	cc: string[];
	object: Message;
};
export type FollowMessage = {
	"@context": "https://www.w3.org/ns/activitystreams";
	id: `https://${string}`;
	type: "Follow";
	actor: `https://${string}`;
	object: `https://${string}`;
};
export type AcceptMessage = {
	"@context": "https://www.w3.org/ns/activitystreams";
	id: `https://${string}`;
	type: "Accept";
	actor: `https://${string}`;
	object: FollowMessage;
};
export type Message = NoteMessage | CreateMessage | FollowMessage | AcceptMessage;
