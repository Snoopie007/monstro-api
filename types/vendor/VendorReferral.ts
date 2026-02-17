import { vendorReferrals } from "@subtrees/schemas";
import { Vendor } from "../vendor";

export type VendorReferral = typeof vendorReferrals.$inferSelect & {
    vendor?: Vendor;
    referred?: Partial<Vendor>;
}
