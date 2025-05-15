import { FlowTemplate } from "@/types"

const DefaultAISettings = {
    maxAttempts: 10,
    maxChars: 150,
}

export const Nodes = [
    { label: "AI Goal", value: "ai" },
    { label: "Extraction", value: "extraction" },
    { label: "Retrieval", value: "retrieval" },
]

export const Logics = [
    { label: "Condition", value: "condition" },
    { label: "Delay", value: "delay" },
]



type PreDefinedVariable = {


    name: string,
    data: {
        key: string,
        returnType: "string" | "number" | "boolean",
        description: string
    }
}


export const PreDefinedVariables: PreDefinedVariable[] = [
    {
        name: "First Name", data: {
            key: "firstName",
            returnType: "string",
            description: "The first name of the user"
        }
    },
    {
        name: "Last Name", data: {
            key: "lastName",
            returnType: "string",
            description: "The last name of the user"
        }
    },
    {
        name: "Email", data: {
            key: "email",
            returnType: "string",
            description: "The email of the user"
        }
    },
    {
        name: "Phone",
        data: {
            key: "phone",
            returnType: "string",
            description: "The phone number of the user"
        }
    },
    {
        name: "Custom",
        data: {
            key: "",
            returnType: "string",
            description: ""
        }
    },

]

const FirstNameVariable = `<span class=\"variable\" data-type=\"mention\" data-id=\"1\" data-label=\"First Name\" data-value=\"prospect.firstName\">First Name</span>`

export const Templates: FlowTemplate[] = [
    {
        label: "Book Appointment",
        description: "AI will attempt to book appointments for the user.",
        nodes: [
            {
                type: 'retrieval',
                data: {
                    label: "Book Appointment",
                    editable: true,
                    retrieval: {
                        ...DefaultAISettings,
                        goal: `Book a trial class for the ${FirstNameVariable} using the available schedules provided, do not make up time.`,
                        knowledgeBase: "api",
                        instructions: `Use the available schedules provided to book an appointment for the ${FirstNameVariable}.`,
                    }
                }
            },
            {
                type: 'extraction',

                data: {
                    label: "Extract Appointment Time",
                    editable: false,
                    extraction: {
                        "variables": [
                            {
                                key: "appointmentTime",
                                returnType: "string",
                                description: "Find the matching time slot timestamp with time zone in ISO 8601 format with UTC from these slots: @schedules.slots"
                            }
                        ]
                    }
                }
            },
            {
                type: 'integration',
                data: {
                    label: "[GHL] Add to Calendar",
                    editable: true,
                    integration: {
                        action: undefined,
                        service: "ghl",
                        calendarId: undefined,
                    }
                }
            }
        ]
    },
    {
        label: "Collect  Information",
        description: "AI will attempt to email and phone number of the user.",
        nodes: [
            {
                type: 'ai',
                data: {
                    label: "Collect Information",
                    editable: true,
                    ai: {
                        ...DefaultAISettings,
                        goal: `Collect the email and phone number of the ${FirstNameVariable}.`,
                    }
                },
            }
        ]
    },

    {
        label: "Send Link",
        description: "AI will attempt to send the user a link.",
        nodes: [
            {
                type: 'ai',
                data: {
                    label: "Send Link",
                    editable: true,
                    ai: {
                        ...DefaultAISettings,
                        goal: `Send a relevant link to the ${FirstNameVariable}.`,
                    }
                }
            }
        ]
    }
]
