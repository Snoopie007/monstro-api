import { afterAll, beforeAll, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { relations } from "drizzle-orm";
import { Elysia } from "elysia";
import { SignJWT } from "jose";
import { AuthMiddleware } from "@/middlewares/AuthMW";
import { attendances } from "@/subtrees/schemas/attendances";
import { reservations } from "@/subtrees/schemas/reservations";
import { memberRanks, rankProcesses } from "@/subtrees/schemas/rank";
import { RankAttendanceTriggerSchema } from "@/subtrees/bullmq";
import { workflows, workflowTriggers, workflowQueues } from "@/subtrees/schemas/workflow";
import { staffs, staffsLocations } from "@/subtrees/schemas/staffs";
import { locations } from "@/subtrees/schemas/locations";

const originalSecret = process.env.SUPABASE_JWT_SECRET;
const secret = "local-checkin-auth-test-secret-not-for-production";

describe.skipIf(!process.env.WORKFLOW_TEST_DATABASE_URL)("check-in rank delivery with local Postgres", () => {
    const url = process.env.WORKFLOW_TEST_DATABASE_URL!;
    const namespace = `checkin_rank_test_${crypto.randomUUID().replaceAll("-", "")}`;
    const admin = postgres(url, { max: 1, onnotice: () => {} });
    const client = postgres(url, { max: 4, prepare: false, connection: { search_path: `${namespace},public,extensions`, application_name: namespace } });
    const reservationRelations = relations(reservations, ({ one }) => ({
        attendance: one(attendances, { fields: [reservations.id], references: [attendances.reservationId] }),
    }));
    const db = drizzle(client, { schema: { attendances, reservations, memberRanks, rankProcesses, reservationRelations, staffs, staffsLocations } });
    const tables = ["check_ins", "reservations", "member_ranks", "rank_processes", "workflows", "workflow_triggers", "workflow_queues", "staffs", "staff_locations"];
    const nodes = [
        { id: "start", type: "start" as const, position: { x: 0, y: 0 }, data: { label: "Start" } },
        { id: "end", type: "end" as const, parentId: "start", position: { x: 0, y: 1 }, data: { label: "End" } },
    ];
    const add = mock(async (_name: string, _data: unknown, _options: unknown) => {});
    let app: Pick<Elysia, "handle">;
    beforeAll(async () => {
        process.env.SUPABASE_JWT_SECRET = secret;
        const parsed = new URL(url);
        if (!["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname) || parsed.search) throw new Error("Local Postgres required");
        await admin`create schema ${admin(namespace)}`;
        for (const table of tables) await admin`create table ${admin(namespace)}.${admin(table)} (like public.${admin(table)} including all)`;
        mock.module("@/db/db", () => ({ db }));
        mock.module("@/subtrees/schemas", () => ({ attendances, reservations, locations, staffsLocations }));
        mock.module("@/queues", () => ({ rankQueue: { add }, classQueue: { getJob: async () => null } }));
        const { locationCheckin } = await import("./checkin");
        app = new Elysia().use(AuthMiddleware).group("/locations/:lid", (app) => app.use(locationCheckin));
    });
    afterAll(async () => {
        if (originalSecret === undefined) delete process.env.SUPABASE_JWT_SECRET;
        else process.env.SUPABASE_JWT_SECRET = originalSecret;
        await client.end();
        await admin`drop schema if exists ${admin(namespace)} cascade`;
        await admin.end();
    });
    beforeEach(async () => {
        add.mockClear();
        for (const table of tables) await client`truncate ${client(namespace)}.${client(table)}`;
        await db.insert(reservations).values({ id: "reservation", memberId: "member", locationId: "location", startOn: new Date(Date.now() - 60000), endOn: new Date(Date.now() + 3600000) });
        await db.insert(rankProcesses).values({ id: "process", locationId: "location", name: "Ranks" });
        await db.insert(memberRanks).values({ memberId: "member", locationId: "location", processId: "process", rankId: "rank-a" });
        await client`insert into staffs (id,user_id,first_name,last_name,email,phone) values ('staff','staff-user','Staff','Test','staff@example.invalid','0000000000')`;
        await db.insert(staffsLocations).values({ staffId: "staff", locationId: "location", status: "active" });
        await db.insert(workflows).values([
            { id: "workflow", locationId: "location", name: "Attendance", status: "active", nodes },
            { id: "elsewhere", locationId: "elsewhere", name: "Other location", status: "active", nodes },
        ]);
        await db.insert(workflowTriggers).values([
            { id: "trigger", workflowId: "workflow", type: "attendance::recorded", data: { label: "Attendance" } },
            { id: "other-trigger", workflowId: "elsewhere", type: "attendance::recorded", data: { label: "Attendance" } },
        ]);
    });
    const checkin = async (location = "location", actor: { memberId?: string | null; userId?: string; role?: string } = { memberId: "member" }) => {
        const token = await new SignJWT({ role: actor.role ?? "authenticated", user_metadata: { member_id: actor.memberId } })
            .setProtectedHeader({ alg: "HS256" }).setSubject(actor.userId ?? "user")
            .setExpirationTime("5m").sign(new TextEncoder().encode(secret));
        return app.handle(new Request(`http://localhost/locations/${location}/checkin`, {
            method: "POST", headers: { "Content-Type": "application/json", "X-Mobile": "true", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ rid: "reservation" }),
        }));
    };

    test("an unrelated member cannot create attendance, workflow, or rank work", async () => {
        const response = await checkin("location", { memberId: "other-member", userId: "other-user" });
        expect(response.status).toBe(403);
        expect(await db.select().from(attendances)).toHaveLength(0);
        expect(await db.select().from(workflowQueues)).toHaveLength(0);
        expect(add).not.toHaveBeenCalled();
    });

    test.each(["pending_payment", "cancelled_by_member", "cancelled_by_vendor", "cancelled_by_holiday", "completed", "no_show"] as const)(
        "does not create attendance or workflow for status %s", async (status) => {
            await db.update(reservations).set({ status });
            const response = await checkin();
            expect(response.status).toBe(400);
            expect(await response.json()).toEqual({ error: "Only confirmed reservations can be checked in" });
            expect(await db.select().from(attendances)).toHaveLength(0);
            expect(await db.select().from(workflowQueues)).toHaveLength(0);
            expect(add).not.toHaveBeenCalled();
        },
    );

    test("allows staff with an active membership at this location", async () => {
        expect((await checkin("location", { memberId: null, userId: "staff-user" })).status).toBe(200);
        expect(await db.select().from(workflowQueues)).toHaveLength(1);
    });

    test.each(["inactive", "different-location"])("rejects staff access that is %s", async (access) => {
        await db.update(staffsLocations).set(access === "inactive" ? { status: "inactive" } : { locationId: "elsewhere" });
        expect((await checkin("location", { memberId: null, userId: "staff-user" })).status).toBe(403);
        expect(await db.select().from(attendances)).toHaveLength(0);
        expect(add).not.toHaveBeenCalled();
    });

    test("preserves trusted service calls while still rejecting cancelled bookings", async () => {
        await db.update(reservations).set({ status: "cancelled_by_vendor" });
        expect((await checkin("location", { role: "service_role" })).status).toBe(400);
        await db.update(reservations).set({ status: "confirmed" });
        expect((await checkin("location", { role: "service_role" })).status).toBe(200);
    });

    test("persists the reservation and enqueues the real text attendance ID", async () => {
        const response = await checkin();
        expect(response.status).toBe(200);
        const rows = await db.select().from(attendances);
        expect(rows).toHaveLength(1);
        expect(rows[0]!.id).toStartWith("chk_");
        expect(rows[0]!.reservationId).toBe("reservation");
        expect(rows[0]!.rankProcessedAt).toBeNull();
        expect(add).toHaveBeenCalledWith("attendance", { attendanceId: rows[0]!.id }, { jobId: `rank-${rows[0]!.id}` });
        expect(RankAttendanceTriggerSchema.parse(add.mock.calls[0]![1])).toEqual({ attendanceId: rows[0]!.id });
        expect(await db.select().from(workflowQueues)).toEqual([expect.objectContaining({
            workflowId: "workflow", memberId: "member",
            metadata: { trigger: { type: "attendance::recorded", attendanceId: rows[0]!.id }, nodes },
        })]);
    });

    test("repeated check-ins cannot insert or enqueue twice", async () => {
        expect((await checkin()).status).toBe(200);
        await db.update(workflowQueues).set({ stopped: "completed" });
        await db.update(reservations).set({ status: "completed" });
        const repeated = await checkin();
        expect(repeated.status).toBe(400);
        expect(await repeated.json()).toEqual({ error: "Already checked in for this session" });
        expect(await db.select().from(attendances)).toHaveLength(1);
        expect(add).toHaveBeenCalledTimes(1);
        expect(await db.select().from(workflowQueues)).toHaveLength(1);
    });

    test("does not attach another location's reservation to this location", async () => {
        expect((await checkin("different-location")).status).toBe(404);
        expect(await db.select().from(attendances)).toHaveLength(0);
        expect(add).not.toHaveBeenCalled();
    });

    test("members without a rank still check in without a rank job", async () => {
        await db.delete(memberRanks);
        expect((await checkin()).status).toBe(200);
        expect(await db.select().from(attendances)).toHaveLength(1);
        expect(add).not.toHaveBeenCalled();
        expect(await db.select().from(workflowQueues)).toHaveLength(1);
    });

    test("concurrent repeated check-ins create one attendance and one workflow run", async () => {
        const responses = await Promise.all([checkin(), checkin()]);
        expect(responses.map(r => r.status).sort()).toEqual([200, 400]);
        expect(await db.select().from(attendances)).toHaveLength(1);
        expect(await db.select().from(workflowQueues)).toHaveLength(1);
        expect(add).toHaveBeenCalledTimes(1);
    });

    test("dispatch failure rolls attendance back and never enqueues rank work", async () => {
        const log = spyOn(console, "log").mockImplementation(() => {});
        await client`alter table workflow_queues add constraint reject_run check (false)`;
        try {
            expect((await checkin()).status).toBe(500);
            expect(await db.select().from(attendances)).toHaveLength(0);
            expect(await db.select().from(workflowQueues)).toHaveLength(0);
            expect(add).not.toHaveBeenCalled();
        } finally {
            await client`alter table workflow_queues drop constraint reject_run`;
            log.mockRestore();
        }
    });

    test("draft workflows do not run", async () => {
        await db.update(workflows).set({ status: "draft" });
        expect((await checkin()).status).toBe(200);
        expect(await db.select().from(workflowQueues)).toHaveLength(0);
    });

    test("rechecks status after waiting for a concurrent cancellation", async () => {
        const locked = Promise.withResolvers<void>();
        const release = Promise.withResolvers<void>();
        const cancellation = db.transaction(async (tx) => {
            await tx.update(reservations).set({ status: "cancelled_by_vendor" });
            locked.resolve();
            await release.promise;
        });
        await locked.promise;
        const pending = checkin();
        try {
            let waiting = false;
            for (let attempt = 0; attempt < 100 && !waiting; attempt++) {
                waiting = (await admin`select pid from pg_stat_activity where application_name=${namespace} and wait_event_type='Lock'`).length > 0;
                if (!waiting) await Bun.sleep(10);
            }
            expect(waiting).toBe(true);
        } finally {
            release.resolve();
            await cancellation;
        }
        expect((await pending).status).toBe(400);
        expect(await db.select().from(attendances)).toHaveLength(0);
        expect(await db.select().from(workflowQueues)).toHaveLength(0);
        expect(add).not.toHaveBeenCalled();
    });
});
