import { afterAll, beforeEach, expect, mock, spyOn, test } from "bun:test";

let staffRows: { staff: { user: { id: string; email: string } | null } }[] = [];
mock.module("@/db/db", () => ({
    db: { query: { staffsLocations: { findMany: async () => staffRows } } },
}));

const { notifyDocumentSigned } = await import("./documentSignedNotification");

const signed = {
    docId: "doc-1",
    memberId: "mbr-1",
    memberName: "Jane Doe",
    documentTitle: "Liability Waiver",
    locationId: "loc-1",
    locationName: "Demo Dojo",
    vendorUser: { id: "usr-owner", email: "owner@example.com" },
};

const originalFetch = globalThis.fetch;
const originalKey = process.env.NOVU_API_KEY;
const fetchMock = mock(async (_url: string | URL | Request, _init?: RequestInit) => new Response("{}", { status: 201 }));
const novuCalls = () => fetchMock.mock.calls.map(([url, init]) => ({ url: String(url), body: JSON.parse(String(init?.body)) }));

beforeEach(() => {
    staffRows = [
        { staff: { user: { id: "usr-owner", email: "owner@example.com" } } },
        { staff: { user: { id: "usr-staff", email: "staff@example.com" } } },
        { staff: { user: null } },
    ];
    process.env.NOVU_API_KEY = "test-key";
    fetchMock.mockClear();
    fetchMock.mockImplementation(async () => new Response("{}", { status: 201 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterAll(() => {
    globalThis.fetch = originalFetch;
    process.env.NOVU_API_KEY = originalKey;
});

test("notifies the location's owner and active staff once each in one trigger, linking to the member's documents", async () => {
    await notifyDocumentSigned(signed);

    const [call, ...rest] = novuCalls();
    expect(rest).toEqual([]);
    expect(call!.url).toBe("https://api.novu.co/v1/events/trigger");
    expect(call!.body.name).toBe("vendor-member-signed-document");
    expect(call!.body.to).toEqual([
        { subscriberId: "usr-owner", email: "owner@example.com" },
        { subscriberId: "usr-staff", email: "staff@example.com" },
    ]);
    expect(call!.body.payload).toMatchObject({
        memberName: "Jane Doe",
        documentTitle: "Liability Waiver",
        locationName: "Demo Dojo",
        url: "/dashboard/location/loc-1/contracts?memberId=mbr-1",
    });
});

test("splits recipients into triggers of at most 100, Novu's limit", async () => {
    staffRows = Array.from({ length: 150 }, (_, i) => ({ staff: { user: { id: `usr-${i}`, email: `staff${i}@example.com` } } }));
    await notifyDocumentSigned(signed);

    expect(novuCalls().map((call) => call.body.to.length)).toEqual([100, 51]);
});

test("sends nothing when the location has no one to notify", async () => {
    staffRows = [];
    await notifyDocumentSigned({ ...signed, vendorUser: null });

    expect(fetchMock).not.toHaveBeenCalled();
});

test("a Novu outage is logged, not thrown", async () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => undefined);
    fetchMock.mockImplementation(async () => { throw new Error("Novu is down"); });

    await expect(notifyDocumentSigned(signed)).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalledWith(
        "[docs] 2 vendor notification(s) failed for signed document doc-1",
        expect.any(Array),
    );
    consoleError.mockRestore();
});
