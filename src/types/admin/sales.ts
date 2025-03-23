export type SalesStatus = 'Pending' | 'Closed' | 'Completed';

export type Sale = {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    locationId?: number | null;
    ghlLocationId?: string | null;
    userId?: number | null;
    planId?: number | null;
    packageId?: number | null;
    stripeCustomerId?: string | null;
    paymentId?: number | null;
    closedAt?: Date | null;
    status: SalesStatus;
    created: Date;
    updated?: Date | null;
}
