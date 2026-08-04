import type { AddonEditorInput, BundleEditorInput } from "@subtrees/types";
import { expect, test } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import { Elysia } from "elysia";

test.skipIf(!Bun.env.DATABASE_URL)("catalog persistence is location-scoped and versions purchased definitions", async () => {
	const { db } = await import("@/db/db");
	const {
		addonPlanPriceOverrides,
		addons,
		bundlePurchases,
		bundles,
		locations,
		memberInvoices,
		memberPlanPricing,
		memberPlans,
		memberSubscriptionAddons,
		memberSubscriptions,
		members,
		users,
		vendors,
	} = await import("@subtrees/schemas");
	const {
		archiveAddon,
		archiveBundle,
		createAddon,
		createBundle,
		getBundle,
		getCatalogOptions,
		listAddons,
		listBundles,
		updateAddon,
		updateBundle,
	} = await import("./catalog");
	const {
		cancelSubscriptionAddon,
		getSubscriptionAddonOverview,
		purchaseSubscriptionAddon,
	} = await import("./subscriptionAddons");

	const suffix = crypto.randomUUID().replaceAll("-", "");
	const createdUserIds: string[] = [];
	const createdBundleIds: string[] = [];
	const createdAddonIds: string[] = [];
	let memberSubscriptionId: string | undefined;
	let purchaseId: string | undefined;
	const createdInvoiceIds: string[] = [];

	try {
		const [vendorUser] = await db.insert(users).values({
			name: "Catalog Test Vendor",
			email: `catalog-vendor-${suffix}@example.test`,
			username: `catalog_vendor_${suffix}`,
			discriminator: 9101,
		}).returning({ id: users.id });
		if (!vendorUser) throw new Error("Test vendor user was not created");
		createdUserIds.push(vendorUser.id);

		const [vendor] = await db.insert(vendors).values({
			firstName: "Catalog",
			lastName: "Test",
			email: `catalog-vendor-${suffix}@example.test`,
			userId: vendorUser.id,
		}).returning({ id: vendors.id });
		if (!vendor) throw new Error("Test vendor was not created");

		const [primaryLocation, otherLocation] = await db.insert(locations).values([
			{
				name: `Catalog Primary ${suffix}`,
				slug: `catalog-primary-${suffix}`,
				country: "US",
				vendorId: vendor.id,
			},
			{
				name: `Catalog Other ${suffix}`,
				slug: `catalog-other-${suffix}`,
				country: "US",
				vendorId: vendor.id,
			},
		]).returning({ id: locations.id });
		if (!primaryLocation || !otherLocation) throw new Error("Test locations were not created");

		const [primaryPlan, otherPlan] = await db.insert(memberPlans).values([
			{ name: "Singles", description: "", type: "recurring", locationId: primaryLocation.id },
			{ name: "Other location plan", description: "", type: "recurring", locationId: otherLocation.id },
		]).returning({ id: memberPlans.id });
		if (!primaryPlan || !otherPlan) throw new Error("Test plans were not created");

		const [regularPrice, memberPrice] = await db.insert(memberPlanPricing).values([
			{ memberPlanId: primaryPlan.id, name: "Regular", price: 50000, interval: "month", intervalThreshold: 1 },
			{ memberPlanId: primaryPlan.id, name: "Member", price: 35000, interval: "month", intervalThreshold: 1 },
		]).returning({ id: memberPlanPricing.id });
		await db.insert(memberPlanPricing).values({
			memberPlanId: otherPlan.id,
			name: "Other",
			price: 10000,
			interval: "month",
			intervalThreshold: 1,
		});
		if (!regularPrice || !memberPrice) throw new Error("Test prices were not created");

		const addonInput: AddonEditorInput = {
			name: "Annual membership",
			description: "Catalog integration fixture",
			amount: 19900,
			currency: "usd",
			billingType: "recurring",
			interval: "year",
			intervalThreshold: 1,
			classAccessOverride: "unlimited",
			planPriceOverrides: [{
				sourcePlanPricingId: regularPrice.id,
				replacementPlanPricingId: memberPrice.id,
			}],
		};
		const addon = await createAddon(primaryLocation.id, addonInput);
		createdAddonIds.push(addon.id);

		expect(addon.currency).toBe("USD");
		expect(addon.planPriceOverrides).toHaveLength(1);
		const updatedAddon = await updateAddon(primaryLocation.id, addon.id, { ...addonInput, amount: 24900 });
		expect(updatedAddon.status).toBe("updated");
		if (updatedAddon.status !== "updated") throw new Error("Expected an in-place add-on update");
		expect(updatedAddon.addon.amount).toBe(24900);
		const mappingHistory = await db.select({ archived: addonPlanPriceOverrides.archived })
			.from(addonPlanPriceOverrides)
			.where(eq(addonPlanPriceOverrides.addonId, addon.id));
		expect(mappingHistory).toHaveLength(2);
		expect(mappingHistory.filter((mapping) => mapping.archived)).toHaveLength(1);
		expect((await listAddons(primaryLocation.id)).map((item) => item.id)).toContain(addon.id);
		expect((await listAddons(otherLocation.id)).map((item) => item.id)).not.toContain(addon.id);
		const primaryOptions = await getCatalogOptions(primaryLocation.id);
		expect(primaryOptions.planPricings).toHaveLength(2);
		expect(primaryOptions.addons.map((item) => item.id)).toEqual([addon.id]);

		const { xAddonsBundles } = await import("./root");
		const unauthorizedApp = new Elysia().group("/x/loc/:lid", (group) => group.use(xAddonsBundles));
		const unauthorizedResponse = await unauthorizedApp.handle(new Request(
			`http://localhost/x/loc/${primaryLocation.id}/addons-bundles/options`,
		));
		expect(unauthorizedResponse.status).toBe(403);

		const authorizedApp = new Elysia()
			.derive(() => ({ vendorId: vendor.id }))
			.group("/x/loc/:lid", (group) => group.use(xAddonsBundles));
		const authorizedResponse = await authorizedApp.handle(new Request(
			`http://localhost/x/loc/${primaryLocation.id}/addons-bundles/options`,
		));
		expect(authorizedResponse.status).toBe(200);

		const bundleInput: BundleEditorInput = {
			name: "Singles annual bundle",
			description: null,
			components: [
				{ type: "subscription", memberPlanPricingId: regularPrice.id, priceOverride: 32000, required: true },
				{ type: "addon", addonId: addon.id, priceOverride: null, required: true },
			],
		};
		const createdBundle = await createBundle(primaryLocation.id, bundleInput);
		createdBundleIds.push(createdBundle.id);
		expect(createdBundle.components.map((component) => component.displayName)).toEqual([
			"Singles · Regular",
			"Annual membership",
		]);

		const inPlaceUpdate = await updateBundle(primaryLocation.id, createdBundle.id, {
			...bundleInput,
			name: "Singles annual bundle revised",
		});
		expect(inPlaceUpdate.status).toBe("updated");
		if (inPlaceUpdate.status !== "updated") throw new Error("Expected an in-place update");
		expect(inPlaceUpdate.bundle.id).toBe(createdBundle.id);

		const [memberUser] = await db.insert(users).values({
			name: "Catalog Test Member",
			email: `catalog-member-${suffix}@example.test`,
			username: `catalog_member_${suffix}`,
			discriminator: 9102,
		}).returning({ id: users.id });
		if (!memberUser) throw new Error("Test member user was not created");
		createdUserIds.push(memberUser.id);

		const [member] = await db.insert(members).values({
			userId: memberUser.id,
			firstName: "Catalog",
			lastName: "Member",
			email: `catalog-member-${suffix}@example.test`,
		}).returning({ id: members.id });
		if (!member) throw new Error("Test member was not created");

		const periodStart = new Date();
		const periodEnd = new Date(periodStart);
		periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
		const [subscription] = await db.insert(memberSubscriptions).values({
			memberId: member.id,
			memberPlanPricingId: regularPrice.id,
			locationId: primaryLocation.id,
			status: "active",
			startDate: periodStart,
			currentPeriodStart: periodStart,
			currentPeriodEnd: periodEnd,
		}).returning({ id: memberSubscriptions.id });
		if (!subscription) throw new Error("Test subscription was not created");
		memberSubscriptionId = subscription.id;

		const [subscriptionAddonPurchase] = await db.insert(memberSubscriptionAddons).values({
			memberSubscriptionId: subscription.id,
			addonId: addon.id,
			status: "active",
			paidPeriodStartsAt: periodStart,
			paidPeriodEndsAt: periodEnd,
		}).returning({ id: memberSubscriptionAddons.id });
		if (!subscriptionAddonPurchase) throw new Error("Test add-on purchase was not created");

		const overview = await getSubscriptionAddonOverview(primaryLocation.id, subscription.id);
		expect(overview?.effectivePricing.id).toBe(memberPrice.id);
		expect(overview?.unlimitedClassAccess).toBe(true);
		expect(await getSubscriptionAddonOverview(otherLocation.id, subscription.id)).toBeNull();
		expect((await purchaseSubscriptionAddon(primaryLocation.id, subscription.id, addon.id)).status).toBe("already-purchased");

		const accessOnlyAddon = await createAddon(primaryLocation.id, {
			...addonInput,
			name: "Access only",
			amount: 2500,
			planPriceOverrides: [],
		});
		createdAddonIds.push(accessOnlyAddon.id);
		const accessPurchase = await purchaseSubscriptionAddon(primaryLocation.id, subscription.id, accessOnlyAddon.id);
		expect(accessPurchase.status).toBe("created");
		if (accessPurchase.status !== "created") throw new Error("Access-only add-on purchase was not created");
		const [openInvoice] = await db.insert(memberInvoices).values({
			memberId: member.id,
			locationId: primaryLocation.id,
			memberSubscriptionAddonId: accessPurchase.purchaseId,
			status: "sent",
			tax: 0,
			total: 2500,
			subTotal: 2500,
		}).returning({ id: memberInvoices.id });
		if (!openInvoice) throw new Error("Open add-on invoice was not created");
		createdInvoiceIds.push(openInvoice.id);
		const immediateCancellation = await cancelSubscriptionAddon(primaryLocation.id, accessPurchase.purchaseId);
		expect(immediateCancellation).toEqual({ status: "canceled", runAt: null });
		const [voidedInvoice] = await db.select({ status: memberInvoices.status })
			.from(memberInvoices)
			.where(eq(memberInvoices.id, openInvoice.id));
		expect(voidedInvoice?.status).toBe("void");

		const [otherMemberPrice] = await db.insert(memberPlanPricing).values({
			memberPlanId: primaryPlan.id,
			name: "Other member price",
			price: 32500,
			interval: "month",
			intervalThreshold: 1,
		}).returning({ id: memberPlanPricing.id });
		if (!otherMemberPrice) throw new Error("Conflicting member price was not created");
		const conflictingAddon = await createAddon(primaryLocation.id, {
			...addonInput,
			name: "Conflicting price",
			planPriceOverrides: [{
				sourcePlanPricingId: regularPrice.id,
				replacementPlanPricingId: otherMemberPrice.id,
			}],
		});
		createdAddonIds.push(conflictingAddon.id);
		expect((await purchaseSubscriptionAddon(primaryLocation.id, subscription.id, conflictingAddon.id)).status).toBe("pricing-conflict");
		const cancellation = await cancelSubscriptionAddon(primaryLocation.id, subscriptionAddonPurchase.id);
		expect(cancellation.status).toBe("canceled");
		expect(cancellation.runAt?.toISOString()).toBe(periodEnd.toISOString());
		await archiveAddon(primaryLocation.id, accessOnlyAddon.id);
		await archiveAddon(primaryLocation.id, conflictingAddon.id);
		await expect((async () => {
			await db.update(addons).set({ amount: 1 }).where(eq(addons.id, addon.id));
		})()).rejects.toThrow();

		const versionedAddon = await updateAddon(primaryLocation.id, addon.id, { ...addonInput, amount: 29900 });
		expect(versionedAddon.status).toBe("versioned");
		if (versionedAddon.status !== "versioned") throw new Error("Expected a versioned add-on update");
		createdAddonIds.push(versionedAddon.addon.id);
		expect(versionedAddon.addon.id).not.toBe(addon.id);
		expect((await listAddons(primaryLocation.id)).find((item) => item.id === addon.id)?.archived).toBe(true);
		expect((await getCatalogOptions(primaryLocation.id)).addons.map((item) => item.id)).toEqual([
			versionedAddon.addon.id,
		]);

		const [purchase] = await db.insert(bundlePurchases).values({
			bundleId: createdBundle.id,
			memberId: member.id,
			status: "active",
		}).returning({ id: bundlePurchases.id });
		if (!purchase) throw new Error("Test purchase was not created");
		purchaseId = purchase.id;
		await expect((async () => {
			await db.update(bundles).set({ name: "Unsafe rewrite" }).where(eq(bundles.id, createdBundle.id));
		})()).rejects.toThrow();

		const versionedUpdate = await updateBundle(primaryLocation.id, createdBundle.id, {
			...bundleInput,
			name: "Singles annual bundle v2",
		});
		expect(versionedUpdate.status).toBe("versioned");
		if (versionedUpdate.status !== "versioned") throw new Error("Expected a versioned update");
		createdBundleIds.push(versionedUpdate.bundle.id);
		expect(versionedUpdate.bundle.id).not.toBe(createdBundle.id);
		expect((await getBundle(primaryLocation.id, createdBundle.id))?.archived).toBe(true);
		expect(versionedUpdate.bundle.archived).toBe(false);
		expect((await listBundles(primaryLocation.id)).map((bundle) => bundle.id)).toEqual(expect.arrayContaining([
			createdBundle.id,
			versionedUpdate.bundle.id,
		]));
		expect(await listBundles(otherLocation.id)).toEqual([]);
		expect((await archiveBundle(primaryLocation.id, versionedUpdate.bundle.id))?.archived).toBe(true);
		expect((await archiveAddon(primaryLocation.id, versionedAddon.addon.id))?.archived).toBe(true);
		expect((await getCatalogOptions(primaryLocation.id)).addons).toEqual([]);
	} finally {
		if (createdInvoiceIds.length > 0) await db.delete(memberInvoices).where(inArray(memberInvoices.id, createdInvoiceIds));
		if (purchaseId) await db.delete(bundlePurchases).where(eq(bundlePurchases.id, purchaseId));
		if (memberSubscriptionId) await db.delete(memberSubscriptions).where(eq(memberSubscriptions.id, memberSubscriptionId));
		if (createdBundleIds.length > 0) await db.delete(bundles).where(inArray(bundles.id, createdBundleIds));
		if (createdAddonIds.length > 0) await db.delete(addons).where(inArray(addons.id, createdAddonIds));
		if (createdUserIds.length > 0) await db.delete(users).where(inArray(users.id, createdUserIds));
		await db.$client.end();
	}
});
