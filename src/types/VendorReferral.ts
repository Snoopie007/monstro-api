import { vendorReferrals } from "@/db/schemas";
import { Vendor } from "./vendor";

export type VendorReferral = typeof vendorReferrals.$inferInsert & {
    vendor?: Vendor;
    referred?: Partial<Vendor>;
}
