import { Elysia } from "elysia";
import { activateSubscriptionRoutes } from "./activate";
import { activateCashSubscriptionRoutes } from "./activateCash";
import { cancelSubscriptionRoutes } from "./cancel";
import { createSubscriptionRoutes } from "./create";
import { subscriptionMakeupCreditsRoutes } from "./makeupCredits";
import { pauseSubscriptionRoutes } from "./pause";
import { resumeSubscriptionRoutes } from "./resume";
import { updateSubscriptionRoutes } from "./update";

export const xSubscriptions = new Elysia({ prefix: "/subscriptions" })
    .use(createSubscriptionRoutes)
    .use(activateSubscriptionRoutes)
    .use(activateCashSubscriptionRoutes)
    .use(pauseSubscriptionRoutes)
    .use(resumeSubscriptionRoutes)
    .use(updateSubscriptionRoutes)
    .use(cancelSubscriptionRoutes)
    .use(subscriptionMakeupCreditsRoutes);
