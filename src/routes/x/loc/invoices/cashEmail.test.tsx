import * as React from "react";
import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import InvoiceReminderEmail from "@/subtrees/emails/InvoiceReminderEmail";

test("cash invoice email shows the currency and location date without an online pay button", () => {
    const html = renderToStaticMarkup(<InvoiceReminderEmail
        member={{ firstName: "Jasper", lastName: "Test" }}
        location={{ name: "Cash test", address: null, email: "vendor@example.test", phone: null }}
        timezone="America/New_York"
        invoice={{ id: "inv_cash", total: 12500, currency: "CAD", paymentType: "cash",
            dueDate: new Date("2026-10-02T02:00:00Z"), description: "Weekly membership",
            items: [{ name: "Weekly", quantity: 1, price: 12500 }] }}
    />);
    expect(html).toContain("Please arrange your cash payment directly with");
    expect(html).toContain("Due Oct 1, 2026");
    expect(html).toContain("CA$125.00");
    expect(html).not.toContain("Pay this invoice");
});
