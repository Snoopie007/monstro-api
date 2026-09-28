import { afterAll, beforeAll, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { relations } from "drizzle-orm";
import { Elysia } from "elysia";
import { SignJWT } from "jose";
import { AuthMiddleware } from "@/middlewares/AuthMW";
import { supportConversations } from "@subtrees/schemas/SupportConversations";
import { supportAssistants } from "@subtrees/schemas/SupportAssistants";
import { memberLocations } from "@subtrees/schemas/MemberLocation";
import { members } from "@subtrees/schemas/members";
import { locations } from "@subtrees/schemas/locations";
import { vendors } from "@subtrees/schemas/vendors";
import { users } from "@subtrees/schemas/users";
import { staffs, staffsLocations } from "@subtrees/schemas/staffs";
import { workflows, workflowTriggers, workflowQueues } from "@subtrees/schemas/workflow";

const originalSecret = process.env.SUPABASE_JWT_SECRET;
const secret = "local-support-auth-test-secret-not-for-production";

describe.skipIf(!process.env.WORKFLOW_TEST_DATABASE_URL)("support creation with local Postgres", () => {
    const url = process.env.WORKFLOW_TEST_DATABASE_URL!;
    const namespace = `support_api_test_${crypto.randomUUID().replaceAll("-", "")}`;
    const admin = postgres(url, { max: 1, onnotice: () => {} });
    const client = postgres(url, { max: 4, prepare: false, connection: { search_path: `${namespace},public,extensions` } });
    const schema = {
        supportConversations, supportAssistants, memberLocations, members, locations, vendors, users, staffs, staffsLocations,
        locationsRelations: relations(locations, ({ one }) => ({ vendor: one(vendors, { fields: [locations.vendorId], references: [vendors.id] }) })),
        vendorsRelations: relations(vendors, ({ one }) => ({ user: one(users, { fields: [vendors.userId], references: [users.id] }) })),
        staffsLocationsRelations: relations(staffsLocations, ({ one }) => ({ staff: one(staffs, { fields: [staffsLocations.staffId], references: [staffs.id] }) })),
        staffsRelations: relations(staffs, ({ one }) => ({ user: one(users, { fields: [staffs.userId], references: [users.id] }) })),
    };
    const db = drizzle(client, { schema });
    const tables = ["support_conversations", "support_assistants", "member_locations", "members", "locations", "vendors", "users", "staffs", "staff_locations", "workflows", "workflow_triggers", "workflow_queues"];
    const broadcast = mock(async (..._args: unknown[]) => {});
    const notify = mock(async (..._args: unknown[]) => ({ error: null }));
    let app: Pick<Elysia, "handle">;
    beforeAll(async () => {
        const parsed = new URL(url);
        if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) || parsed.search) throw new Error("Local Postgres required");
        process.env.SUPABASE_JWT_SECRET = secret;
        await admin`create schema ${admin(namespace)}`;
        for (const table of tables) await admin`create table ${admin(namespace)}.${admin(table)} (like public.${admin(table)} including all)`;
        mock.module("@/db/db", () => ({ db }));
        mock.module("@subtrees/schemas", () => schema);
        mock.module("subtrees/schemas", () => schema);
        mock.module("@/libs/broadcast", () => ({ broadcastSupportConversation: broadcast, formatSupportConversationPayload: (value: unknown) => value }));
        mock.module("@/libs/novu", () => ({ notifyUsersNewSupportConversation: notify }));
        const { mlSupportRoutes } = await import("./support");
        app = new Elysia().use(AuthMiddleware).group("/members/:mid/locations/:lid", app => app.use(mlSupportRoutes));
    });
    afterAll(async () => {
        if (originalSecret === undefined) delete process.env.SUPABASE_JWT_SECRET;
        else process.env.SUPABASE_JWT_SECRET = originalSecret;
        await client.end();
        await admin`drop schema if exists ${admin(namespace)} cascade`;
        await admin.end();
    });
    beforeEach(async () => {
        broadcast.mockReset();
        notify.mockReset();
        notify.mockResolvedValue({ error: null });
        for (const table of tables) await client`truncate ${client(namespace)}.${client(table)}`;
        await client`insert into locations (id,name,slug,vendor_id,timezone) values ('location','Support School','support-school','vendor','UTC')`;
        await client`insert into vendors (id,user_id,first_name,email) values ('vendor','owner','Owner','owner@example.invalid')`;
        await client`insert into members (id,user_id,first_name,email) values ('member','user','Test','test@example.invalid')`;
        await db.insert(memberLocations).values({ memberId: "member", locationId: "location" });
        await db.insert(supportAssistants).values({ id: "assistant", locationId: "location", modelId: "test" });
        await db.insert(workflows).values({ id: "workflow", locationId: "location", name: "Support", status: "active", nodes: [
            { id: "start", type: "start", position: { x: 0, y: 0 }, data: { label: "Start" } },
            { id: "end", type: "end", parentId: "start", position: { x: 0, y: 1 }, data: { label: "End" } },
        ] });
        await db.insert(workflowTriggers).values({ id: "trigger", workflowId: "workflow", type: "support::created", data: { label: "Support" } });
    });
    const create = async (actor = { memberId: "member", userId: "user", role: "authenticated" }) => {
        const token = await new SignJWT({ role: actor.role, user_metadata: { member_id: actor.memberId } })
            .setProtectedHeader({ alg: "HS256" }).setSubject(actor.userId).setExpirationTime("5m")
            .sign(new TextEncoder().encode(secret));
        return app.handle(new Request("http://localhost/members/member/locations/location/support", {
            method: "POST", headers: { "X-Mobile": "true", Authorization: `Bearer ${token}` },
        }));
    };

    test("a member opening an empty chat creates the matching workflow run", async () => {
        const response = await create();
        expect(response.status).toBe(200);
        const conversation = await response.json() as { id: string };
        const [run] = await db.select().from(workflowQueues);
        expect(run?.metadata).toMatchObject({ trigger: { type: "support::created", conversationId: conversation.id } });
        expect(broadcast).toHaveBeenCalledTimes(1);
    });
    test("an unrelated member cannot create a ticket or run", async () => {
        expect((await create({ memberId: "other", userId: "other", role: "authenticated" })).status).toBe(403);
        expect(await db.select().from(supportConversations)).toHaveLength(0);
        expect(await db.select().from(workflowQueues)).toHaveLength(0);
    });
    test("the target member must belong to this location", async () => {
        await db.delete(memberLocations);
        expect((await create()).status).toBe(404);
        expect(await db.select().from(supportConversations)).toHaveLength(0);
    });
    test("trusted service calls can create a ticket for a location member", async () => {
        expect((await create({ memberId: "", userId: "service", role: "service_role" })).status).toBe(200);
        expect(await db.select().from(workflowQueues)).toHaveLength(1);
    });
    test("active staff have access, inactive staff do not", async () => {
        await client`insert into staffs (id,user_id,first_name,last_name,email,phone) values ('staff','staff-user','Staff','Test','staff@example.invalid','0000000000')`;
        await db.insert(staffsLocations).values({ staffId: "staff", locationId: "location", status: "active" });
        const actor = { memberId: "", userId: "staff-user", role: "authenticated" };
        expect((await create(actor)).status).toBe(200);
        await db.delete(staffsLocations);
        expect((await create(actor)).status).toBe(403);
        expect(await db.select().from(supportConversations)).toHaveLength(1);
    });
    test("workflow failure rolls back ticket creation", async () => {
        const quiet = spyOn(console, "error").mockImplementation(() => {});
        await client`alter table workflow_queues add constraint test_reject_run check (member_id <> 'member')`;
        try {
            expect((await create()).status).toBe(500);
            expect(await db.select().from(supportConversations)).toHaveLength(0);
            expect(broadcast).not.toHaveBeenCalled();
        } finally {
            await client`alter table workflow_queues drop constraint test_reject_run`;
            quiet.mockRestore();
        }
    });
    test("notification and broadcast failure leave the committed ticket successful", async () => {
        const quiet = spyOn(console, "error").mockImplementation(() => {});
        broadcast.mockRejectedValueOnce(new Error("Offline"));
        notify.mockRejectedValueOnce(new Error("Offline"));
        try {
            expect((await create()).status).toBe(200);
            expect(notify).toHaveBeenCalledTimes(1);
            expect(await db.select().from(workflowQueues)).toHaveLength(1);
        } finally { quiet.mockRestore(); }
    });
});
