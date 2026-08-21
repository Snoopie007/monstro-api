import { beforeEach, describe, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";

let accessAllowed = true;
let existingFee: Record<string, unknown> | undefined;
const insertedValues: Array<Record<string, unknown>> = [];
const updatedValues: Array<Record<string, unknown>> = [];
let deleted = true;

const sampleFee = {
	id: "fee-1",
	locationId: "location-1",
	label: "Facility Fee",
	description: null,
	type: "fixed",
	amount: 500,
	checkoutTypes: ["package"],
	taxable: false,
	active: true,
	created: new Date("2026-08-20T00:00:00Z"),
	updated: new Date("2026-08-20T00:00:00Z"),
};

const findMany = mock(async () => [sampleFee]);
const findFirst = mock(async () => existingFee);
const insertReturning = mock(async () => [{ ...sampleFee, ...insertedValues.at(-1) }]);
const updateReturning = mock(async () => [{ ...sampleFee, ...updatedValues.at(-1) }]);
const deleteReturning = mock(async () => deleted ? [{ id: sampleFee.id }] : []);

const db = {
	query: {
		additionalFees: { findMany, findFirst },
	},
	insert: mock(() => ({
		values: mock((values: Record<string, unknown>) => {
			insertedValues.push(values);
			return { returning: insertReturning };
		}),
	})),
	update: mock(() => ({
		set: mock((values: Record<string, unknown>) => {
			updatedValues.push(values);
			return { where: mock(() => ({ returning: updateReturning })) };
		}),
	})),
	delete: mock(() => ({
		where: mock(() => ({ returning: deleteReturning })),
	})),
};

mock.module("@/db/db", () => ({ db }));
mock.module("@/utils/merchandise", () => ({
	canAccessLocation: mock(async () => ({ allowed: accessAllowed })),
}));

const { xAdditionalFees } = await import("./additionalFees");
const app = new Elysia().group("/x/loc/:lid", (group) => group.use(xAdditionalFees));

function request(path = "", init?: RequestInit) {
	return app.handle(new Request(`http://localhost/x/loc/location-1/additional-fees${path}`, init));
}

describe("Additional fee management", () => {
	beforeEach(() => {
		mock.clearAllMocks();
		accessAllowed = true;
		existingFee = sampleFee;
		deleted = true;
		insertedValues.length = 0;
		updatedValues.length = 0;
	});

	test("rejects users without access to the location", async () => {
		accessAllowed = false;
		const response = await request();

		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({ error: "Location access denied" });
		expect(findMany).not.toHaveBeenCalled();
	});

	test("creates a normalized fee in the requested location", async () => {
		const response = await request("/", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				label: "  Booking Fee  ",
				description: "  Covers staffing  ",
				type: "percentage",
				amount: 250,
				checkoutTypes: ["order", "package", "order"],
				taxable: true,
			}),
		});

		expect(response.status).toBe(201);
		expect(insertedValues[0]).toEqual(expect.objectContaining({
			locationId: "location-1",
			label: "Booking Fee",
			description: "Covers staffing",
			type: "percentage",
			amount: 250,
			checkoutTypes: ["package", "order"],
			taxable: true,
		}));
	});

	test("allows percentage fees above the frontend warning threshold", async () => {
		const response = await request("/", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				label: "Large fee",
				type: "percentage",
				amount: 15_000,
				checkoutTypes: ["subscription"],
			}),
		});

		expect(response.status).toBe(201);
		expect(insertedValues[0]).toEqual(expect.objectContaining({ amount: 15_000 }));
	});

	test("updates editable fields while retaining existing values", async () => {
		const response = await request("/fee-1", {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ active: false, taxable: true }),
		});

		expect(response.status).toBe(200);
		expect(updatedValues[0]).toEqual(expect.objectContaining({
			label: sampleFee.label,
			type: sampleFee.type,
			amount: sampleFee.amount,
			checkoutTypes: sampleFee.checkoutTypes,
			active: false,
			taxable: true,
		}));
	});

	test("returns 404 when a location-scoped delete finds no fee", async () => {
		deleted = false;
		const response = await request("/missing", { method: "DELETE" });

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Additional fee not found" });
	});
});
