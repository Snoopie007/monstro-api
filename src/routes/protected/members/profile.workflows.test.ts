import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, getTableName } from "drizzle-orm";
import { getTableConfig, type AnyPgTable } from "drizzle-orm/pg-core";
import { Elysia } from "elysia";
import { members, memberFields, memberCustomFields, familyMembers } from "@subtrees/schemas/members";
import { users } from "@subtrees/schemas/users";
import { memberLocations } from "@subtrees/schemas/MemberLocation";
import { workflows, workflowTriggers, workflowQueues } from "@subtrees/schemas/workflow";
import { captureMemberWorkflowState, dispatchMemberUpdated } from "@subtrees/utils/server/workflows";

// Opt in to local Postgres. Each run owns an isolated, randomly named schema.
describe.skipIf(!process.env.WORKFLOW_TEST_DATABASE_URL)("Member Updated transactions", () => {
	const schemaName = `workflow_test_${crypto.randomUUID().replaceAll("-", "")}`;
	const client = postgres(process.env.WORKFLOW_TEST_DATABASE_URL!, {
		max: 2, connection: { search_path: schemaName }, prepare: false,
	});
	const db = drizzle(client, { schema: { members, users } });
	const tables: AnyPgTable[] = [members, users, memberLocations, memberFields, memberCustomFields, workflows, workflowTriggers, workflowQueues];
	let app: Pick<Elysia, "handle">;
	const nodes = [
		{ id: "start", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
		{ id: "end", type: "end", parentId: "start", position: { x: 0, y: 1 }, data: { label: "End" } },
	];
	beforeAll(async () => {
		await client.unsafe(`CREATE SCHEMA "${schemaName}"`);
		// Mirror the queried columns; unrelated tables and application foreign keys
		// are intentionally absent. Keep the real active-run uniqueness constraint.
		for (const table of tables) {
			const columns = getTableConfig(table).columns.map((column) => {
				// The monorepo schemas use text/base62 identifiers; the API's older
				// member artifacts still annotate some of those identifiers as UUID.
				const type = column.getSQLType() === "uuid" || ("enumValues" in column && column.enumValues?.length)
					? "text" : column.getSQLType();
				const defaultSql = column.name === "id" ? " DEFAULT md5(random()::text)"
					: type === "jsonb" ? " DEFAULT '{}'::jsonb" : "";
				return `"${column.name}" ${type}${defaultSql}`;
			});
			await client.unsafe(`CREATE TABLE "${schemaName}"."${getTableName(table)}" (${columns.join(",")})`);
		}
		await client.unsafe('CREATE UNIQUE INDEX active_run ON workflow_queues (workflow_id,member_id) WHERE stopped IS NULL');
		mock.module("@/db/db", () => ({ db }));
		mock.module("@subtrees/schemas", () => ({ members, users, familyMembers }));
		mock.module("@/libs/redis", () => ({ getRedisClient: () => ({
			get: async () => `123456::verified@example.com::${Math.floor(Date.now() / 1000)}`,
			del: async () => 1, set: async () => undefined,
		}) }));
		mock.module("@/libs/email", () => ({ EmailSender: class { async sendAsync() {} } }));
		mock.module("@/utils", () => ({ generateOtp: () => "123456" }));
		const { memberProfile } = await import("./profile");
		app = new Elysia().group("/member/:mid/profile", (app) => app.use(memberProfile));
	});
	afterAll(async () => {
		await client.unsafe(`DROP SCHEMA "${schemaName}" CASCADE`);
		await client.end();
	});
	beforeEach(async () => {
		for (const table of tables) await client.unsafe(`TRUNCATE "${schemaName}"."${getTableName(table)}"`);
		await db.insert(users).values({ id: "u1", name: "Ada", email: "old@example.com", username: "ada" });
		await db.insert(members).values({ id: "m1", userId: "u1", firstName: "Ada", lastName: "L", email: "old@example.com" });
		await db.insert(memberLocations).values([
			{ memberId: "m1", locationId: "a", profile: null },
			{ memberId: "m1", locationId: "b", profile: { email: "override@example.com" } as never },
		]);
		await db.insert(workflows).values([
			{ id: "wa", locationId: "a", name: "A", status: "active", nodes: nodes as never },
			{ id: "wb", locationId: "b", name: "B", status: "active", nodes: nodes as never },
		]);
		await db.insert(workflowTriggers).values([
			{ id: "ta", workflowId: "wa", type: "member::updated", data: { label: "Email", config: { fields: ["email"] } } },
			{ id: "tb", workflowId: "wb", type: "member::updated", data: { label: "Email", config: { fields: ["email"] } } },
		]);
	});
	const request = (path: string, body: object) => app.handle(new Request(`http://localhost/member/m1/profile${path}`, {
		method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
	}));

	test("member self-service updates dispatch only where the effective email changed", async () => {
		const response = await request("/", { firstName: "Ada", lastName: "L", email: "new@example.com" });
		expect(response.status).toBe(200);
		const runs = await db.select().from(workflowQueues);
		expect(runs.map((run) => run.workflowId)).toEqual(["wa"]);
		expect(runs[0]!.metadata).toMatchObject({ triggerType: "member::updated", changedFields: ["email"] });
	});
	test("verified email update uses the same dispatch and commits user/member changes together", async () => {
		const response = await request("/email/verify", { token: "123456" });
		expect(response.status).toBe(200);
		expect((await db.select().from(members))[0]!.email).toBe("verified@example.com");
		expect((await db.select().from(users))[0]!.email).toBe("verified@example.com");
		expect((await db.select().from(workflowQueues)).map((row) => row.workflowId)).toEqual(["wa"]);
	});
	test("saving the same values or only an unwatched field creates no run", async () => {
		expect((await request("/", { firstName: "Ada", lastName: "L", email: "old@example.com" })).status).toBe(200);
		expect((await request("/", { firstName: "Changed", email: "old@example.com" })).status).toBe(200);
		expect(await db.select().from(workflowQueues)).toHaveLength(0);
	});
	test("vendor location override dispatches only for that location", async () => {
		await db.transaction(async (tx) => {
			const before = await captureMemberWorkflowState(tx, "m1", "b");
			await tx.update(memberLocations).set({ profile: { email: "local-new@example.com" } as never })
				.where(eq(memberLocations.locationId, "b"));
			await dispatchMemberUpdated(tx, before);
		});
		expect((await db.select().from(workflowQueues)).map((row) => row.workflowId)).toEqual(["wb"]);
		expect((await db.select().from(members))[0]!.email).toBe("old@example.com");
	});
	test("custom fields match IDs and one batch creates only one run", async () => {
		await db.insert(memberFields).values({ id: "score", name: "Score", type: "number", locationId: "a" });
		await db.update(workflowTriggers).set({ data: { label: "Score", config: { fields: ["custom:score"] } } })
			.where(eq(workflowTriggers.id, "ta"));
		await db.transaction(async (tx) => {
			const before = await captureMemberWorkflowState(tx, "m1", "a");
			await tx.insert(memberCustomFields).values({ memberId: "m1", customFieldId: "score", value: "5" });
			await tx.update(memberCustomFields).set({ value: "10" }).where(eq(memberCustomFields.memberId, "m1"));
			await dispatchMemberUpdated(tx, before);
		});
		const runs = await db.select().from(workflowQueues);
		expect(runs).toHaveLength(1);
		expect(runs[0]!.metadata).toMatchObject({ changedFields: ["custom:score"] });
	});
	test("a transaction rollback removes both the update and its workflow run", async () => {
		await expect(db.transaction(async (tx) => {
			const before = await captureMemberWorkflowState(tx, "m1");
			await tx.update(members).set({ email: "rolled-back@example.com" }).where(eq(members.id, "m1"));
			await dispatchMemberUpdated(tx, before);
			throw new Error("abort test update");
		})).rejects.toThrow("abort test update");
		expect((await db.select().from(members))[0]!.email).toBe("old@example.com");
		expect(await db.select().from(workflowQueues)).toHaveLength(0);
	});
	test("multiple matching trigger rows and later edits preserve the one-active-run rule", async () => {
		await db.insert(workflowTriggers).values({
			id: "ta2", workflowId: "wa", type: "member::updated", data: { label: "Second", config: { fields: ["email"] } },
		});
		await request("/", { firstName: "Ada", email: "one@example.com" });
		await request("/", { firstName: "Ada", email: "two@example.com" });
		expect(await db.select().from(workflowQueues)).toHaveLength(1);
	});
	test("unconfigured legacy triggers do not run", async () => {
		await db.update(workflowTriggers).set({ data: { label: "Legacy" } });
		await request("/", { firstName: "Ada", email: "new@example.com" });
		expect(await db.select().from(workflowQueues)).toHaveLength(0);
	});
	test("temporary changes reverted within the same update do not dispatch", async () => {
		await db.transaction(async (tx) => {
			const before = await captureMemberWorkflowState(tx, "m1");
			await tx.update(members).set({ email: "temporary@example.com" }).where(eq(members.id, "m1"));
			await tx.update(members).set({ email: "old@example.com" }).where(eq(members.id, "m1"));
			await dispatchMemberUpdated(tx, before);
		});
		expect(await db.select().from(workflowQueues)).toHaveLength(0);
	});
	test("concurrent global and location updates keep consistent snapshots", async () => {
		await Promise.all([
			db.transaction(async (tx) => {
				const before = await captureMemberWorkflowState(tx, "m1");
				await tx.update(members).set({ email: "global@example.com" }).where(eq(members.id, "m1"));
				await dispatchMemberUpdated(tx, before);
			}),
			db.transaction(async (tx) => {
				const before = await captureMemberWorkflowState(tx, "m1", "b");
				await tx.update(memberLocations).set({ profile: { email: "local@example.com" } as never })
					.where(eq(memberLocations.locationId, "b"));
				await dispatchMemberUpdated(tx, before);
			}),
		]);
		expect((await db.select().from(workflowQueues)).map((row) => row.workflowId).sort()).toEqual(["wa", "wb"]);
	});
});
