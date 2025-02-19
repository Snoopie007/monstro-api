
export type Location = {
    id: number;
    name: string;
    industry: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    website: string | null;
    country: string | null;
    phone: string | null;
    timezone: string | null;
    status: string | null;
    vendorId: number;
    isNew: boolean;
    created: Date;
    updated: Date | null;
    deleted: Date | null;
};