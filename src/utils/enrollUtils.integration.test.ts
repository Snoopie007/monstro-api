import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/subtrees/schemas";

const url = process.env.BILLING_TEST_DATABASE_URL;
describe.skipIf(!url)("enrollment documents", () => {
    const namespace = `enroll_docs_test_${crypto.randomUUID().replaceAll("-", "")}`;
    const admin = postgres(url!, { max: 1, onnotice: () => {} });
    const sql = postgres(url!, { max: 1, prepare: false, connection: { search_path: `${namespace},public,extensions` }, onnotice: () => {} });
    const db = drizzle(sql, { schema });
    let createEnrollUnsignedDocs: typeof import("./enrollUtils").createEnrollUnsignedDocs;
    const enroll = (memberPlanId: string) => db.transaction((tx) =>
        createEnrollUnsignedDocs(tx, { mid: "member", lid: "loc", memberPlanId, contractId: "agreement" }));
    const docs = () => db.select().from(schema.memberContracts);

    beforeAll(async () => {
        if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(url!).hostname)) throw new Error("Local Postgres required");
        await admin`create schema ${admin(namespace)}`;
        // Copies production's one-document-per-template rule (member_contracts_unique).
        for (const table of ["member_contracts", "member_locations", "location_state"]) {
            await admin`create table ${admin(namespace)}.${admin(table)} (like public.${admin(table)} including all)`;
        }
        // Production-only columns that no migration creates.
        await admin`alter table ${admin(namespace)}.member_contracts add column if not exists user_agent text, add column if not exists ip_address text`;
        mock.module("@/db/db", () => ({ db }));
        ({ createEnrollUnsignedDocs } = await import("./enrollUtils"));
    });
    afterAll(async () => { await sql.end(); await admin`drop schema if exists ${admin(namespace)} cascade`; await admin.end(); });
    beforeEach(async () => {
        await sql`truncate member_contracts, member_locations, location_state`;
        await sql`insert into member_locations (member_id,location_id) values ('member','loc')`;
        await sql`insert into location_state (location_id,plan_id,status) values ('loc',2,'active')`;
    });

    test("a new membership gets the plan's document", async () => {
        const [id] = await enroll("sub_new");
        expect(await docs()).toMatchObject([{ id, templateId: "agreement", memberPlanId: "sub_new", signedOn: null }]);
    });

    test("a member who signed the template on another membership gets no new document", async () => {
        await sql`insert into member_contracts (id,member_id,contract_id,location_id,member_plan_id,signed_on) values ('signed','member','agreement','loc','sub_old',now())`;
        expect(await enroll("sub_new")).toEqual([]);
        expect((await docs()).map((doc) => doc.id)).toEqual(["signed"]);
    });

    test("a member's unsigned copy from another membership is reused", async () => {
        await sql`insert into member_contracts (id,member_id,contract_id,location_id,member_plan_id) values ('pending','member','agreement','loc','sub_old')`;
        expect(await enroll("sub_new")).toEqual(["pending"]);
        expect((await docs()).map((doc) => doc.id)).toEqual(["pending"]);
    });
});
