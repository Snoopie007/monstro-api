import { expect, mock, test } from "bun:test";
const transaction = mock(async () => { throw new Error("Unexpected write"); });
mock.module("@/db/db", () => ({ db: { transaction, query: {
  programs: { findFirst: async () => ({ id: "prg_1", name: "Piano", sessionMode: "one_on_one", sessions: [] }) },
  locations: { findFirst: async () => ({ timezone: "UTC" }) },
  reservations: { findFirst: async () => ({ id: "rsv_1", program: { sessionMode: "one_on_one" } }) },
} } }));
mock.module("@/routes/protected/locations/reservations/utils", () => ({ getSessionState: mock() }));
const { executeScheduleSession } = await import("./scheduleSession");
const { executeCancelSession } = await import("./cancelSession");
test("assistant directs one-on-one bookings to the vendor calendar without writes", async () => {
  const result = await executeScheduleSession({ memberId: "mbr_1", programId: "prg_1" }, "loc_1");
  expect(result.ask?.question).toContain("vendor calendar");
  expect(transaction).not.toHaveBeenCalled();
});
test("assistant does not cancel or refund a one-on-one lesson", async () => {
  const result = await executeCancelSession({ reservationId: "rsv_1", refundClassCredit: true }, "loc_1");
  expect(result.ask?.question).toContain("vendor calendar");
  expect(transaction).not.toHaveBeenCalled();
});
