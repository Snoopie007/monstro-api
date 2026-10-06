import { db } from "@/db/db";
import { emailQueue } from "@/queues/email";
import { issueCashInvoice } from "@/subtrees/utils/server/cashInvoices";

export function sendCashInvoice(locationId: string, invoiceId: string) {
    return db.transaction(tx => issueCashInvoice(tx, locationId, invoiceId, (email, jobId) =>
        emailQueue.add("send-email", email, {
            jobId, attempts: 3, backoff: { type: "exponential", delay: 5000 },
            removeOnComplete: false, removeOnFail: false,
        }),
    ));
}
