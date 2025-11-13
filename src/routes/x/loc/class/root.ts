import { Elysia } from "elysia";
import { classReminderRoutes } from "./reminder";
import { recurringClassReminderRoutes } from "./recurring";
import { missedClassCheckRoutes } from "./missed";

export const xClass = new Elysia({ prefix: "/class" })
    .use(classReminderRoutes)
    .use(recurringClassReminderRoutes)
    .use(missedClassCheckRoutes);

