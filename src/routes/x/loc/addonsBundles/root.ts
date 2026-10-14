import { Elysia } from "elysia";
import { addonRoutes } from "./addonRoutes";
import { bundleRoutes } from "./bundleRoutes";
import { subscriptionAddonRoutes } from "./subscriptionAddonRoutes";

export const xAddonsBundles = new Elysia()
	.use(addonRoutes)
	.use(bundleRoutes)
	.use(subscriptionAddonRoutes);
