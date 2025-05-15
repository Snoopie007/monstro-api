import { Node } from "@xyflow/react"

export type AIBot = {
    id: number
    locationId: number
    botQueues?: BotQueue[]
    description: string | null
    title: string
    initialMessage: string | null
    botName: string
    reason: string
    responseDetails: string
    objectives: Node<NodeDataType>[] | null
    personality: string[]
    temperature: number
    maxTokens: number
    model: string
    invalidNodes: string[]
    status: "Draft" | "Active" | "Pause" | "Deleted"
    created: Date
    updated: Date | null
}

export type CustomVariable = {
    id: number;
    label: string;
    value: string;
};

export type CustomVariableGroup = {
    name: string;
    variables: CustomVariable[];
}
export type AILogState = {
    rating?: number;
    ratingExplain?: string;
    objective: string;
    attempts: number;
    completed?: boolean;
    reasoning?: string;
}



export type BotQueue = {
    id: number
    botId: number
    prospectId: string
    currentNode: string
    attempts: number
    stopped: boolean
    stoppedReason?: string | null
    completedNodes?: string[]
    metadata: Record<string, any>
    logs?: BotLog[],
    created?: Date
    updated?: Date | null
}

export type BotLog = {
    queueId: number
    nodeId: string
    messageId: number
    type: string,
    state?: AILogState
    conditions?: Record<string, unknown>
    metadata?: Record<string, unknown>
    response?: string
    errors?: Record<string, unknown>
    created?: Date
}


export type Condition = {
    field: string
    operator: string
    value: string
    type: 'string' | 'number' | 'boolean'
}

export type VariableSchema = {
    key: string;
    description: string,
    returnType: 'string' | 'number' | 'boolean'
}

export type FieldOption = {
    key: string
    type: "string" | "number" | "boolean"
}

export type FieldOptionGroup = {
    group: string
    options: FieldOption[]
}

export type ExtractionNodeOptions = {
    variables: VariableSchema[]
}

export type IntegrationNodeOptions = {
    service: 'ghl'
    action?: 'updateOrCreateContact' | 'addToCalendar' | 'addToWorkflow'
    integrationId?: number
    workflowId?: string
    calendarId?: string
    contactId?: string
}

export type PathNodeOptions = {
    isDefault: boolean
    condition?: Condition
}

export type AINodeOptions = {
    goal: string
    instructions?: string
    maxAttempts: number
    maxChars: number
}

export type DelayNodeOptions = {
    time?: number
    mode?: 'exact' | 'interval'
    interval?: number
}

type APIRetrievalOptions = {
    service?: 'ghl'
    action?: 'getCalendarSlots'
    integrationId?: number
    calendarId?: string
}

type WebsiteRetrievalOptions = {
    url?: string
}

type InternalRetrievalOptions = {
    query?: string
}

export type RetrievalNodeOptions = {
    knowledgeBase: 'website' | 'api' | 'internal'
    goal: string
    api?: APIRetrievalOptions
    website?: WebsiteRetrievalOptions
    internal?: InternalRetrievalOptions
    instructions: string
    maxAttempts: number
    maxChars?: number
}

export type NodeDataType = {
    label: string
    editable?: boolean
    groupParentId?: string
    hasRelated?: boolean
    ai?: AINodeOptions
    extraction?: ExtractionNodeOptions
    integration?: IntegrationNodeOptions
    path?: PathNodeOptions
    delay?: DelayNodeOptions
    retrieval?: RetrievalNodeOptions
}

export type FlowTemplateGroup = {
    category: string,
    label: string,
    description: string,
    templates: FlowTemplate[]
}

export type FlowTemplate = {
    label: string,
    description: string,
    nodes: Omit<Node<NodeDataType>, 'id' | 'position'>[]
}
