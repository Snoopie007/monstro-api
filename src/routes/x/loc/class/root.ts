import { Elysia } from "elysia";
import { classReminderRoutes } from "./reminder";
import { missedClassCheckRoutes } from "./missed";

export const xClass = new Elysia({ prefix: "/class" })
    .use(classReminderRoutes)
    .use(missedClassCheckRoutes);

