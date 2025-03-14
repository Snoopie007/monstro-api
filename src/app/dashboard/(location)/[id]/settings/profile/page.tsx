import { Vendor } from "@/types";
import { UserProfile } from "./components";
import { db } from "@/db/db"; 
import { auth } from "@/auth";

async function getMember(id: number): Promise<Vendor | null> {
    const vendor = await db.query.vendors.findFirst({
        where: (vendors, { eq }) => eq(vendors.id, id),
    });

    return vendor ?? null;
}

export default async function ProfilePage(props: { params: { id: string } }) {
    const { id } = await props.params;
    const session = await auth();
    
    const vendorId = parseInt(session ? session.user.vendorId : 0, 10);
    if (isNaN(vendorId)) {
        return <div>Invalid Vendor ID</div>;
    }

    const vendor = await getMember(vendorId);

    if (!vendor) {
        return <div>Vendor not found.</div>;
    }

    return (
        <div>
            <UserProfile user={vendor} locationId={id} />
        </div>
    );
}
