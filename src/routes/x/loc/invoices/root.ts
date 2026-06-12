import { Elysia } from "elysia";
import { recurringInvoiceRoutes } from "./recurring";
import { oneOffInvoiceRoutes } from "./invoice";
import { overdueInvoiceRoutes } from "./overdue";
import { listInvoiceRoutes } from "./list";
import { detailInvoiceRoutes } from "./detail";

export const xInvoices = new Elysia({ prefix: "/invoices" })
    .use(listInvoiceRoutes)
    .use(detailInvoiceRoutes)
    .use(recurringInvoiceRoutes)
    .use(oneOffInvoiceRoutes)
    .use(overdueInvoiceRoutes)