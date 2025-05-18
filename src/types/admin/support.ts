import { AdminUser } from "./AdminUser";

export type MessageType = 'message' | 'email' | 'call' | 'live chat';
export type MessageRole = 'user' | 'agent' | 'ai';
export type CaseStatus = 'open' | 'escalated' | 'closed';
export type CaseSeverity = 'low' | 'medium' | 'high' | 'urgent';

export type SupportCaseMessage = {
    id?: number;
    content: string;
    type: MessageType;
    role: MessageRole;
    created: Date;
    caseId: number;
    agentId: number | null;
    agent?: AdminUser;
}

export type SupportCaseNote = {
    id?: number;
    note: string;
    created: Date;
    updated?: Date;
    caseId: number;
    agentId: number;
    agent?: AdminUser;
}

export type SupportCaseLog = {
    id?: number;
    from: CaseStatus;
    to: CaseStatus;
    created: Date;
    caseId: number;
    agentId: number | null;
    agent?: AdminUser;
    case?: SupportCase;
}
export type SupportCase = {
    id: number;
    subject: string;
    category: string;
    status: CaseStatus;
    severity: CaseSeverity;
    message: string;
    video: string | null;
    created: Date;
    updated: Date | null;
    agentId: number | null;
    locationId: number;
    accountId: string;
    agent?: AdminUser;
    metadata: Record<string, unknown>;
    messages?: SupportCaseMessage[];
    notes?: SupportCaseNote[];
    logs?: SupportCaseLog[];
    messagesCount?: number;
}
