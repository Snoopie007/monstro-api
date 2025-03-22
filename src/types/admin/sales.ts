export type SalesStatus = 'Pending' | 'Closed' | 'Lost';

export type Sale = {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    locationId?: number;
    ghlLocationId?: string;
    userId?: number;
    planId?: number;
    packageId?: number;
    stripeCustomerId?: string;
    paymentId?: number;
    closedAt?: Date;
    status: SalesStatus;
    created: Date;
    updated?: Date;
}
