import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { Elysia } from "elysia";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@subtrees/schemas";

let database: PostgresJsDatabase<typeof schema>;
let sql: ReturnType<typeof postgres>;
let admin: ReturnType<typeof postgres>;
mock.module("@/db/db", () => ({ db: {
    get select() { return database.select.bind(database); },
    get transaction() { return database.transaction.bind(database); },
} }));
const { xPrograms } = await import("./root");
const app = new Elysia().group("/x/loc/:lid", (app) => app.use(xPrograms));
const databaseUrl = process.env.ONE_ON_ONE_TEST_DATABASE_URL;
const namespace = `test_instructors_${randomUUID().replaceAll("-", "")}`;
const tables = ["locations", "programs", "program_sessions", "staffs", "staff_locations"];

describe.skipIf(!databaseUrl)("program import instructor assignment with local Postgres", () => {
    beforeAll(async () => {
        const url = new URL(databaseUrl!);
        if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.search) throw new Error("Local Postgres required");
        admin = postgres(databaseUrl!, { max: 1, onnotice: () => {} });
        await admin`create schema ${admin(namespace)}`;
        for (const table of tables) await admin`create table ${admin(namespace)}.${admin(table)} (like public.${admin(table)} including all)`;
        sql = postgres(databaseUrl!, { max: 1, prepare: false, connection: { search_path: `${namespace},public,extensions` } });
        database = drizzle(sql, { schema });
    });
    afterAll(async () => {
        if (sql) await sql.end();
        if (admin) {
            if (!/^test_instructors_[a-f0-9]{32}$/.test(namespace)) throw new Error("Unsafe test schema");
            await admin`drop schema if exists ${admin(namespace)} cascade`;
            await admin.end();
        }
    });
    beforeEach(async () => {
        for (const table of tables) await sql`truncate ${sql(namespace)}.${sql(table)}`;
        await sql`insert into locations (id,name,slug,vendor_id,timezone) values
            ('loc_test','Test school','test-school','vendor_test','UTC'), ('loc_other','Other school','other-school','vendor_other','UTC')`;
        await sql`insert into staffs (id,first_name,last_name,email,phone,user_id) values
            ('staff_test','Jamie','Instructor','jamie@example.test','123','user_test'), ('staff_other','Other','Instructor','other@example.test','124','user_other')`;
        await sql`insert into staff_locations (staff_id,location_id) values ('staff_test','loc_test'),('staff_other','loc_other')`;
    });

    function request(programs: unknown[]) {
        return app.handle(new Request("http://localhost/x/loc/loc_test/programs/import", {
            method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ programs }),
        }));
    }
    const draft = { name: "Piano", sessionMode: "one_on_one", instructorId: "staff_test", sessions: [{ day: 1, time: "15:00", duration: 30 }] };

    test("persists the selected instructor on the imported program and each session", async () => {
        const response = await request([{ ...draft, sessions: [...draft.sessions, { day: 3, time: "16:00", duration: 30 }] }]);
        expect(response.status).toBe(201);
        expect([...(await sql`select instructor_id,session_mode from programs`)]).toEqual([{ instructor_id: "staff_test", session_mode: "one_on_one" }]);
        expect([...(await sql`select staff_id from program_sessions`)]).toEqual([{ staff_id: "staff_test" }, { staff_id: "staff_test" }]);
    });

    test.each([undefined, "", "null", "staff_other"])("rejects a missing or foreign instructor: %s", async (instructorId) => {
        const response = await request([{ ...draft, instructorId }]);
        expect(response.status).toBe(400);
        expect(await sql`select id from programs`).toHaveLength(0);
        expect(await sql`select id from program_sessions`).toHaveLength(0);
    });

    test("rejects an invalid batch without partially creating its group programs", async () => {
        const response = await request([{ ...draft, sessionMode: "group", instructorId: undefined }, { ...draft, instructorId: "staff_other" }]);
        expect(response.status).toBe(400);
        expect(await sql`select id from programs`).toHaveLength(0);
    });

    test("keeps the existing group import behavior without an instructor", async () => {
        const response = await request([{ ...draft, sessionMode: "group", instructorId: undefined }]);
        expect(response.status).toBe(201);
        expect([...(await sql`select instructor_id from programs`)]).toEqual([{ instructor_id: null }]);
        expect([...(await sql`select staff_id from program_sessions`)]).toEqual([{ staff_id: null }]);
    });
});
