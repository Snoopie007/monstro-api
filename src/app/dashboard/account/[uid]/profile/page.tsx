import { Staff, Vendor } from "@/types";
import { UserProfile } from "./components";
import { db } from "@/db/db";
import { auth } from "@/auth";
import { notFound } from "next/navigation";

async function getVendor(id: string): Promise<Vendor | undefined> {
    try {
        const vendor = await db.query.vendors.findFirst({
            where: (vendor, { eq }) => eq(vendor.id, id),
        });

        return vendor;
    } catch (error) {
        console.error("Error fetching vendor:", error);
        return undefined;
    }
}

async function getStaff(id: string): Promise<Staff | undefined> {
    try {
        const staff = await db.query.staffs.findFirst({
            where: (staff, { eq }) => eq(staff.id, id),
        });

        return staff;
    } catch (error) {
        console.error("Error fetching staff:", error);
        return undefined;
    }
}

export default async function ProfilePage() {
    const session = await auth();

    if (!session) {
        notFound();
    }

    const isVendor = session?.user.role === "vendor";
    let user = null;
    if (isVendor) {
        user = await getVendor(session?.user.vendorId || "");
    } else {
        user = await getStaff(session?.user.staffId || "");
    }

    if (!user) {
        notFound();
    }

    return (
        <div>
            <UserProfile user={user} isVendor={isVendor} />
        </div>
    );
}
