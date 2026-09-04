import { beforeEach, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";

const queueAdd = mock(async (
    _name: string,
    _data: unknown,
    _options: Record<string, unknown>,
) => undefined);
mock.module("@/queues/email", () => ({ emailQueue: { add: queueAdd } }));

const { xEmailQueue } = await import("./queue");

const payload = {
    recipient: "ava@example.com",
    subject: "Your 1-on-1 lesson is booked",
    template: "PaymentSuccessEmail",
    data: { invoice: { id: "invoice-1" } },
    jobId: "email-one-on-one-paid-rsv_1",
};

async function post(body: unknown, isServiceRole = true) {
    const app = new Elysia({ prefix: "/x/email" }).derive(() => ({ isServiceRole }));
    await xEmailQueue(app as never);
    return app.handle(new Request("http://localhost/x/email/queue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    }));
}

beforeEach(() => mock.clearAllMocks());

test("queues a validated email with its deterministic ID", async () => {
    const response = await post(payload);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ queued: true, jobId: payload.jobId });
    expect(queueAdd).toHaveBeenCalledWith("send-email", {
        to: payload.recipient,
        subject: payload.subject,
        template: payload.template,
        metadata: payload.data,
    }, {
        jobId: payload.jobId,
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: true,
    });
});

test("rejects non-service callers", async () => {
    const response = await post(payload, false);

    expect(response.status).toBe(403);
    expect(queueAdd).not.toHaveBeenCalled();
});

test("rejects an unknown template", async () => {
    const response = await post({ ...payload, template: "MissingTemplate" });

    expect(response.status).toBe(400);
    expect(queueAdd).not.toHaveBeenCalled();
});
