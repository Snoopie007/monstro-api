import { Elysia } from "elysia";
import { classReminderRoutes } from "./reminder";
import { missedClassCheckRoutes } from "./missed";
import { singleNextRoutes } from "./single";

export const xClass = new Elysia({ prefix: "/class" })
    .use(classReminderRoutes)
    .use(missedClassCheckRoutes)
    .use(singleNextRoutes);
