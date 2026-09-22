import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, getTableName, relations } from "drizzle-orm";
import { getTableConfig, type AnyPgTable } from "drizzle-orm/pg-core";
import { Elysia } from "elysia";
import { chats, chatMembers, messages } from "@subtrees/schemas/chat/chats";
import { groupMembers } from "@subtrees/schemas/chat/groups";
import { locations } from "@subtrees/schemas/locations";
import { findOrCreateLocationMemberChat } from "@subtrees/utils/server/locationChats";

describe.skipIf(!process.env.WORKFLOW_TEST_DATABASE_URL)("location-member chat creation", () => {
	const name = `location_chat_test_${crypto.randomUUID().replaceAll("-", "")}`;
	const client = postgres(process.env.WORKFLOW_TEST_DATABASE_URL!, {
		max: 4, prepare: false, connection: { search_path: name }, onnotice: () => {},
	});
	const chatRelations = relations(chats, ({ many }) => ({ chatMembers: many(chatMembers) }));
	const membershipRelations = relations(chatMembers, ({ one }) => ({
		chat: one(chats, { fields: [chatMembers.chatId], references: [chats.id] }),
	}));
	const db = drizzle(client, { schema: { chats, chatMembers, locations, chatRelations, membershipRelations } });
	const tables: AnyPgTable[] = [chats, chatMembers, messages, groupMembers, locations];
	let createLocationChat: typeof import("./chatsGroupsUtils").createLocationChat;
	let addMembertoGroup: typeof import("./chatsGroupsUtils").addMembertoGroup;
	let app: Pick<Elysia, "handle">;
	const member = { userId: "member", firstName: "Ada" };
	const location = { name: "Gym", welcomeMessage: "Welcome {{member.firstName}}", vendor: { userId: "owner" } };
	beforeAll(async () => {
		await client.unsafe(`CREATE SCHEMA "${name}"`);
		for (const table of tables) {
			const columns = getTableConfig(table).columns.map((column) => {
				const raw = column.getSQLType();
				const type = raw === "uuid" || ("enumValues" in column && column.enumValues?.length) ? "text" : raw;
				const defaults = column.name === "id" ? " DEFAULT md5(random()::text)"
					: type === "integer" ? " DEFAULT 0" : type.startsWith("timestamp") ? " DEFAULT now()" : "";
				return `"${column.name}" ${type}${defaults}${column.primary ? " PRIMARY KEY" : ""}`;
			});
			await client.unsafe(`CREATE TABLE "${name}"."${getTableName(table)}" (${columns.join(",")})`);
		}
		await client.unsafe("CREATE UNIQUE INDEX chat_members_unique ON chat_members (chat_id,user_id)");
		await client.unsafe("CREATE UNIQUE INDEX group_members_unique ON group_members (group_id,user_id)");
		mock.module("@/db/db", () => ({ db }));
		mock.module("@subtrees/schemas", () => ({ chats, chatMembers, messages, groupMembers, locations }));
		({ createLocationChat, addMembertoGroup } = await import("./chatsGroupsUtils"));
		const { memberChatRoute } = await import("../routes/x/loc/chat/member");
		app = new Elysia().derive(() => ({ userId: "owner" }))
			.group("/chat/:lid", (app) => app.use(memberChatRoute));
	});
	afterAll(async () => {
		await client.unsafe(`DROP SCHEMA "${name}" CASCADE`);
		await client.end();
	});
	beforeEach(async () => {
		for (const table of tables) await client.unsafe(`TRUNCATE "${name}"."${getTableName(table)}"`);
		await db.insert(locations).values({ id: "loc", name: "Gym", country: "US", slug: "gym", vendorId: "vendor" });
	});

	test("concurrent joins and join retries reuse one chat and send one welcome", async () => {
		const [one, two] = await Promise.all([
			createLocationChat("loc", member, location),
			createLocationChat("loc", member, location),
		]);
		const retried = await createLocationChat("loc", member, location);
		expect(one.id).toBe(two.id);
		expect(retried.id).toBe(one.id);
		expect(await db.select().from(chats)).toHaveLength(1);
		expect(await db.select().from(chatMembers)).toHaveLength(2);
		expect(await db.select().from(messages)).toHaveLength(1);
		expect((await db.select().from(messages))[0]!.content).toBe("Welcome Ada");
		expect((await db.select().from(chatMembers).where(eq(chatMembers.userId, "member")))[0]!.unreadCount).toBe(1);
	});

	test("a join reuses a chat already created by a workflow without adding a welcome", async () => {
		const existing = await db.transaction((tx) => findOrCreateLocationMemberChat(tx, {
			locationId: "loc", locationName: "Gym", senderId: "owner", memberUserId: "member",
		}));
		const joined = await createLocationChat("loc", member, location);
		expect(joined.id).toBe(existing.chat.id);
		expect(await db.select().from(messages)).toHaveLength(0);
	});

	test("join and worker-style creation share the same location-scoped lock", async () => {
		const [joined, worker] = await Promise.all([
			createLocationChat("loc", member, location),
			db.transaction((tx) => findOrCreateLocationMemberChat(tx, {
				locationId: "loc", locationName: "Gym", senderId: "owner", memberUserId: "member",
			})),
		]);
		expect(joined.id).toBe(worker.chat.id);
		expect(await db.select().from(chats)).toHaveLength(1);
	});

	test("manual chat creation races safely with joining", async () => {
		const [joined, response] = await Promise.all([
			createLocationChat("loc", member, location),
			app.handle(new Request("http://localhost/chat/loc/member", {
				method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId: "member" }),
			})),
		]);
		expect([200, 201]).toContain(response.status);
		expect(await response.json()).toMatchObject({ chatId: joined.id });
		expect(await db.select().from(chats)).toHaveLength(1);
	});

	test("manual lookup excludes multi-member chats", async () => {
		await db.insert(chats).values({ id: "shared", locationId: "loc", startedBy: "owner", name: "Shared" });
		await db.insert(chatMembers).values(["owner", "member", "third"].map((userId) => ({ chatId: "shared", userId })));
		const response = await app.handle(new Request("http://localhost/chat/loc/member?memberId=member"));
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ chatId: null });
		const joined = await createLocationChat("loc", member, location);
		expect(joined.id).not.toBe("shared");
	});

	test("later members do not get added to an earlier member's conversation", async () => {
		const first = await createLocationChat("loc", member, location);
		const second = await createLocationChat("loc", { userId: "third", firstName: "Other" }, location);
		expect(first.id).not.toBe(second.id);
		expect((await db.select().from(chatMembers).where(eq(chatMembers.chatId, first.id))).map((row) => row.userId).sort())
			.toEqual(["member", "owner"]);
	});

	test("repeated migration group joins remain idempotent now they are awaited", async () => {
		await db.insert(chats).values({ id: "group-chat", startedBy: "owner", name: "Group", groupId: "g1" });
		await addMembertoGroup("g1", "member");
		await addMembertoGroup("g1", "member");
		expect(await db.select().from(groupMembers)).toHaveLength(1);
		expect(await db.select().from(chatMembers)).toHaveLength(1);
	});
});
