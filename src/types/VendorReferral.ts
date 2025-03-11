import { Vendor } from "./vendor";

export type VendorReferral = {
    id?: number;
    vendorId: number;
    referralId: number;
    vendor?: Vendor;
    referred?: Partial<Vendor>;
    amount: number;
    created: Date;
    accepted: Date | null;
}
