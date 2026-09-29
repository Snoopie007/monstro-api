import { Elysia } from "elysia";
import { classReminderRoutes } from "./reminder";
import { missedClassCheckRoutes } from "./missed";
import { singleNextRoutes } from "./single";
import { singleRecoveryRoutes } from "./recovery";

export const xClass = new Elysia({ prefix: "/class" })
    .use(classReminderRoutes)
    .use(missedClassCheckRoutes)
    .use(singleNextRoutes)
    .use(singleRecoveryRoutes);
