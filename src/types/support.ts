
export type SupportTicketMessage = {
    id: number;
    content: string;
    type: string;
    created: Date;
    updated: Date;
    ticketId: number;
    userName: string;
}

export type SupportTicket = {
    id: number;
    subject: string;
    category: string;
    status: string;
    vendorName: string;
    created: Date;
    updated: Date;
    agentId: string;
    locationId: string;
    messages: SupportTicketMessage[]
    messagesCount: number;
}