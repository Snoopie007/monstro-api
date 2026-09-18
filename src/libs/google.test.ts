import { describe, expect, test } from "bun:test";
import {
	expandBrandMatchTypes,
	mxBrandCampaignName,
	mxSitelinkSpecs,
	parseCallPhone,
	seedBrandKeywords,
	toWebsiteOrigin,
	uniqueAdAssetTexts,
} from "./google";

describe("toWebsiteOrigin", () => {
	test("normalizes a host to https origin", () => {
		expect(toWebsiteOrigin("gym.example.com/schedule")).toBe("https://gym.example.com");
		expect(toWebsiteOrigin("https://gym.example.com/")).toBe("https://gym.example.com");
	});

	test("returns null when website is missing", () => {
		expect(toWebsiteOrigin(null)).toBeNull();
		expect(toWebsiteOrigin("")).toBeNull();
	});
});

describe("parseCallPhone", () => {
	test("formats a US number for Google Ads CallAsset", () => {
		expect(parseCallPhone("(512) 555-0100", "US")).toEqual({
			country_code: "US",
			phone_number: "5125550100",
		});
		expect(parseCallPhone("+15125550100")).toEqual({
			country_code: "US",
			phone_number: "5125550100",
		});
	});

	test("returns null for invalid numbers", () => {
		expect(parseCallPhone("123")).toBeNull();
		expect(parseCallPhone(null)).toBeNull();
	});
});

describe("mxSitelinkSpecs", () => {
	test("builds tour, reviews, pricing, and program sitelinks", () => {
		const links = mxSitelinkSpecs(
			"https://gym.example.com",
			[
				{ pageKey: "home", path: "/" },
				{ pageKey: "pricing", path: "/pricing" },
			],
			[
				{ name: "Krav Maga for Men", slug: "krav-maga-for-men" },
				{ name: "Kids Classes", slug: "kids" },
			],
		);
		expect(links.map((link) => [link.linkText, link.url])).toEqual([
			["Tour", "https://gym.example.com/"],
			["Reviews", "https://gym.example.com/"],
			["Pricing", "https://gym.example.com/pricing"],
			["Krav Maga for Men", "https://gym.example.com/programs/krav-maga-for-men"],
			["Kids Classes", "https://gym.example.com/programs/kids"],
		]);
	});

	test("falls pricing back to /pricing when page is missing", () => {
		const links = mxSitelinkSpecs("https://gym.example.com", [
			{ pageKey: "home", path: "/" },
		]);
		expect(links.map((link) => [link.linkText, link.url])).toEqual([
			["Tour", "https://gym.example.com/"],
			["Reviews", "https://gym.example.com/"],
			["Pricing", "https://gym.example.com/pricing"],
		]);
	});
});

describe("brand quick-win keywords", () => {
	test("seeds name, legal name, and city brand terms", () => {
		expect(seedBrandKeywords({
			name: "Monstro",
			legalName: "Monstro Martial Arts LLC",
			city: "Austin",
		})).toEqual([
			"Monstro",
			"Monstro Martial Arts LLC",
			"Monstro Austin",
		]);
	});

	test("expands each keyword to exact, phrase, and broad", () => {
		expect(expandBrandMatchTypes(["Monstro", "monstro", '"Monstro Austin"'])).toEqual([
			{ text: "monstro", matchType: "EXACT" },
			{ text: "monstro", matchType: "PHRASE" },
			{ text: "monstro", matchType: "BROAD" },
			{ text: "monstro austin", matchType: "EXACT" },
			{ text: "monstro austin", matchType: "PHRASE" },
			{ text: "monstro austin", matchType: "BROAD" },
		]);
	});

	test("clips campaign names and unique ad copy", () => {
		expect(mxBrandCampaignName("Monstro")).toBe("MX Brand - Monstro");
		expect(uniqueAdAssetTexts(["Book a Trial", "book a trial", "Train With Us"], 30, 15)).toEqual([
			"Book a Trial",
			"Train With Us",
		]);
	});
});
