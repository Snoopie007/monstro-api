import { vendorReferrals } from "@/db/schemas";
import { Vendor } from "./vendor";

export type VendorReferral = typeof vendorReferrals.$inferSelect & {
    vendor?: Vendor;
    referred?: Partial<Vendor>;
}
