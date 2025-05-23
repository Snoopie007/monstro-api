import { JSXElementConstructor } from "react";
import { ReactElement } from "react";
import { Vendor } from "../vendor";
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
    agent?: AdminUser | null;
}

export type SupportCaseNote = {
    id?: number;
    note: string;
    created: Date;
    updated: Date | null;
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
    userId: number;
    agent?: AdminUser | null;
    metadata: SupportCaseMetadata;
    messages?: SupportCaseMessage[];
    notes?: SupportCaseNote[];
    logs?: SupportCaseLog[];
    messagesCount?: number;
    vendor?: Vendor;
}

export type SupportCaseMetadata = {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    avatar?: string;
}



export type SupportCategory = {
    id: number,
    name: string,
    description: string | null,
    metas?: SupportDocMeta[]
}


export type SupportDoc = {
    toc: DocToC[]
    meta: SupportDocMeta
    content?: ReactElement<any, string | JSXElementConstructor<any>>

}

export type SupportDocMeta = {
    id?: number
    title: string
    file?: string
    description: string | null
    published?: boolean
    duration?: string
    tags: string[] | null
}

export type DocToC = {
    level: number | undefined
    headline: string | undefined
    slug: string | undefined
}
