import type Elysia from "elysia";
import { createInvoiceRoutes } from "./create";
import { markPaidInvoiceRoutes } from "./markPaid";
import { previewInvoiceRoutes } from "./preview";
import { reminderInvoiceRoutes } from "./reminder";
import { sendInvoiceRoutes } from "./send";

export async function oneOffInvoiceRoutes(app: Elysia) {
    return app
        .use(createInvoiceRoutes)
        .use(previewInvoiceRoutes)
        .use(sendInvoiceRoutes)
        .use(markPaidInvoiceRoutes)
        .use(reminderInvoiceRoutes);
}
