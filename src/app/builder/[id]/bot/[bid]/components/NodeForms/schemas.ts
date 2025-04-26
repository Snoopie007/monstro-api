import { interval } from "drizzle-orm/pg-core";
import { z } from "zod";


const NodeLabelSchema = z.object({
    label: z.string().min(2, { message: "label is too short." }).max(30, { message: "label is too long." }),
    groupParentId: z.string().optional(),
    editable: z.boolean().optional()
})

export const AINodeSchema = z.object({
    options: z.object({
        ai: z.object({
            goal: z.string().min(4, { message: "goal is too short." }),
            instructions: z.string().optional(),
            maxChars: z.coerce.number().min(1).max(250),
            maxAttempts: z.coerce.number().min(1).max(10),
        })
    }),
}).extend({
    node: NodeLabelSchema
});


export const RetrievalNodeSchema = z.object({
    options: z.object({
        retrieval: z.object({
            goal: z.string().min(4, { message: "goal is too short." }),
            knowledgeBase: z.enum(["website", "api", 'internal']),
            instructions: z.string(),
            maxAttempts: z.number().min(1).max(10),
            maxChars: z.number().min(1).max(250),
            api: z.object({
                service: z.enum(["ghl"]),
                action: z.enum(["getCalendarSlots"]),
                integrationId: z.coerce.number(),
                calendarId: z.string(),
            }).optional(),
            website: z.object({
                url: z.string().optional(),
            }).optional()
        })
    }),
}).extend({
    node: NodeLabelSchema
}).superRefine((data, ctx) => {
    if (data.options.retrieval.knowledgeBase === "api" && !data.options.retrieval.api) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "API is required for API retrieval",
        })
    }
})

export const ConditionNodeSchema = z.object({
    node: NodeLabelSchema,
    paths: z.array(z.object({
        id: z.string().optional(),
        node: NodeLabelSchema,
        options: z.object({
            path: z.object({
                isDefault: z.boolean(),
                condition: z.object({
                    operator: z.string().max(25, { message: "operator is too long." }).min(1, { message: "operator is too short." }),
                    value: z.string().max(25, { message: "value is too long." }).min(1, { message: "value is too short." }),
                    field: z.string().max(100, { message: "variable is too long." }).min(3, { message: "variable is too short." }),
                    type: z.enum(["string", "number", "boolean"]),
                }).optional(),
            }).superRefine((data, ctx) => {
                if (!data.isDefault && !data.condition) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "Condition is required for non-default paths",
                        path: ["condition"]
                    });
                }
            })
        })
    }))
})


export const DelayNodeSchema = z.object({
    node: NodeLabelSchema,
    options: z.object({
        delay: z.object({
            mode: z.enum(["exact", "interval"]).default("exact"),
            time: z.number().int().min(1).optional(),
            interval: z.number().int().min(1).optional(),
        }).superRefine(({ mode, time }, ctx) => {
            if (mode === "interval" && !interval) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "interval is required.",
                })
            }
        })
    })
})


export const ExtractionNodeSchema = z.object({
    node: NodeLabelSchema,
    options: z.object({
        extraction: z.object({
            variables: z.array(z.object({
                key: z.string().max(50, { message: "variable is too long." }).min(3, { message: "variable is too short." }),
                returnType: z.enum(["string", "number", "boolean"]),
                description: z.string().max(300, { message: "value is too long." }).min(10, { message: "value is too short." }),
            }))
        })
    })
})



export const GHLIntegrationSchema = z.object({
    node: NodeLabelSchema,
    options: z.object({
        integration: z.object({
            service: z.enum(["ghl"]),
            action: z.enum(["addToCalendar", "updateOrCreateContact", "addToWorkflow"]),
            integrationId: z.coerce.number(),
            calendarId: z.string().optional(),
            contactId: z.string().optional(),
            workflowId: z.string().optional()
        }).superRefine((data, ctx) => {
            if (data.action === "addToCalendar" && !data.calendarId) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Calendar ID is required for addToCalendar action",
                })
            }
            if (data.action === "addToWorkflow" && !data.workflowId) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Workflow ID is required for addToWorkflow action",
                })
            }
            if (data.action === "updateOrCreateContact" && !data.contactId) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Contact ID is required for updateOrCreateContact action",
                })
            }

        })
    })
})

