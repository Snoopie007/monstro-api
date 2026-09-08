import { afterAll, beforeAll, expect, test } from "bun:test";
import { Elysia } from "elysia";
import { SignJWT } from "jose";
import type { AuthXContext } from "./AuthMW";
import { AuthXMiddleware } from "./AuthMW";

const originalSecret = process.env.SUPABASE_JWT_SECRET;
const secret = "test-auth-x-secret-with-enough-entropy";

beforeAll(() => {
    process.env.SUPABASE_JWT_SECRET = secret;
});

afterAll(() => {
    if (originalSecret) process.env.SUPABASE_JWT_SECRET = originalSecret;
    else delete process.env.SUPABASE_JWT_SECRET;
});

async function token(role: string) {
    return new SignJWT({ role })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject("test-user")
        .sign(new TextEncoder().encode(secret));
}

async function request(role: string) {
    const app = new Elysia().use(AuthXMiddleware).get("/", (context) => {
        const { isServiceRole } = context as typeof context & AuthXContext;
        return { isServiceRole };
    });
    return app.handle(new Request("http://localhost/", {
        headers: { authorization: `Bearer ${await token(role)}` },
    }));
}

test("marks service-role tokens for internal routes", async () => {
    const response = await request("service_role");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ isServiceRole: true });
});

test("does not grant service access to vendor tokens", async () => {
    const response = await request("authenticated");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ isServiceRole: false });
});
