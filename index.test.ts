import { describe, expect, test } from "bun:test";
import { app } from "./index";

const vendorVideoUrl = "http://localhost/x/loc/loc_1/courses/crs_1/lessons/les_1/video-url";
const vendorAttachmentsUrl = "http://localhost/x/loc/loc_1/courses/crs_1/lessons/les_1/attachments";


describe("vendor course video API exposure", () => {
	test("requires vendor authentication for signed preview URLs", async () => {
		const response = await app.handle(new Request(vendorVideoUrl));
		expect(response.status).toBe(401);
	});
});

describe("vendor course attachment API exposure", () => {
	test("requires vendor authentication for attachment lists", async () => {
		const response = await app.handle(new Request(vendorAttachmentsUrl));
		expect(response.status).toBe(401);
	});
});
