import { beforeEach, expect, mock, test } from "bun:test";
import {
    PRIVATE_RESERVATION_MATERIALIZE_JOB,
    PrivateReservationMaterializationJobSchema,
} from "@subtrees/bullmq";
import { Elysia } from "elysia";

const queueAdd = mock(async (
    _name: string,
    _data: unknown,
    _options: { jobId: string; removeOnComplete: boolean },
) => ({ id: "materialize-job" }));
mock.module("@/queues", () => ({ classQueue: { add: queueAdd } }));

const { privateReservationMaterializationRoutes } = await import("./privateReservations");
const app = await privateReservationMaterializationRoutes(
    new Elysia({ prefix: "/x/loc/:lid/class" }) as never,
);

beforeEach(() => mock.clearAllMocks());

test("queues a targeted materialization job", async () => {
    const payload = {
        locationId: "location-1",
        privateReservationId: "pvr_1",
    };
    const response = await app.handle(new Request(
        "http://localhost/x/loc/location-1/class/private-reservations/materialize",
        {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
        },
    ));

    expect(response.status).toBe(200);
    expect(PrivateReservationMaterializationJobSchema.safeParse(queueAdd.mock.calls[0]?.[1]).success)
        .toBe(true);
    expect(queueAdd).toHaveBeenCalledWith(
        PRIVATE_RESERVATION_MATERIALIZE_JOB,
        payload,
        expect.objectContaining({
            jobId: `${PRIVATE_RESERVATION_MATERIALIZE_JOB}:pvr_1`,
            removeOnComplete: true,
        }),
    );
});

test("rejects a location mismatch", async () => {
    const response = await app.handle(new Request(
        "http://localhost/x/loc/location-1/class/private-reservations/materialize",
        {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                locationId: "location-2",
                privateReservationId: "pvr_1",
            }),
        },
    ));

    expect(response.status).toBe(400);
    expect(queueAdd).not.toHaveBeenCalled();
});
