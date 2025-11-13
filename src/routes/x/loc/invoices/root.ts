import { Elysia } from "elysia";
import { recurringInvoiceRoutes } from "./recurring";
import { oneOffInvoiceRoutes } from "./invoice";

export const xInvoices = new Elysia({ prefix: "/invoices" })
    .use(recurringInvoiceRoutes)
    .use(oneOffInvoiceRoutes)
