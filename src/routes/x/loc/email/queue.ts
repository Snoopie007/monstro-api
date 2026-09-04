import type { AuthXContext } from "@/middlewares/AuthMW";
import { emailQueue } from "@/queues/email";
import { EmailTemplates } from "@subtrees/emails";
import type { Elysia } from "elysia";
import { z } from "zod";

const QueueEmailSchema = z.object({
    recipient: z.string().email(),
    subject: z.string().min(1),
    template: z.string().min(1),
    data: z.record(z.string(), z.unknown()),
    jobId: z.string().min(1),
});

export async function xEmailQueue(app: Elysia) {
    return app.post("/queue", async (context) => {
        const { body, status, isServiceRole } = context as typeof context & AuthXContext;
        if (!isServiceRole) return status(403, { error: "Service role required" });

        const parsed = QueueEmailSchema.safeParse(body);
        if (!parsed.success) return status(400, { error: "Invalid request" });
        if (!Object.hasOwn(EmailTemplates, parsed.data.template)) {
            return status(400, { error: "Invalid template" });
        }

        await emailQueue.add("send-email", {
            to: parsed.data.recipient,
            subject: parsed.data.subject,
            template: parsed.data.template as keyof typeof EmailTemplates,
            metadata: parsed.data.data,
        }, {
            jobId: parsed.data.jobId,
            attempts: 3,
            backoff: { type: "exponential", delay: 5_000 },
            removeOnComplete: true,
        });
        return { queued: true, jobId: parsed.data.jobId };
    });
}
