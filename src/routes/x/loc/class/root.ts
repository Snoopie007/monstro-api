import { Elysia } from "elysia";
import { classReminderRoutes } from "./reminder";
import { missedClassCheckRoutes } from "./missed";
import { privateReservationMaterializationRoutes } from "./privateReservations";

export const xClass = new Elysia({ prefix: "/class" })
    .use(classReminderRoutes)
    .use(missedClassCheckRoutes)
    .use(privateReservationMaterializationRoutes);
