import { Staff, Vendor } from "@/types";
import { UserEmail, UserProfile } from "./components";
import { db } from "@/db/db";
import { auth } from "@/libs/auth/server";
import { notFound, redirect } from "next/navigation";
import UserPhone from "./components/UserPhone";

async function getVendor(id: string): Promise<Vendor | undefined> {
    try {
        const vendor = await db.query.vendors.findFirst({
            where: (vendor, { eq }) => eq(vendor.id, id),
            with: {
                user: true,
            },
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
            with: {
                user: true,
            },
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
        return redirect('/login');
    }


    const isVendor = session.user.vendorId ? true : false;
    let user = null;
    if (isVendor) {
        user = await getVendor(session.user.vendorId as string);
    } else {
        user = await getStaff(session.user.staffId as string);
    }

    if (!user) {
        notFound();
    }

    return (

        <div className="space-y-2">
            <div className="space-y-1">
                <h2 className="text-2xl font-bold">Profile</h2>
                <p className="text-sm text-muted-foreground">Update your profile information and settings.</p>
            </div>
            <div className="space-y-4">
                {/* <UserAvatar currentAvatar={user?.user?.image || null} onChange={() => { }} isVendor={isVendor} /> */}
                <UserProfile user={user} isVendor={isVendor} />
                <UserEmail user={user} />
                <UserPhone user={user} />
            </div>
        </div>
    );
}
