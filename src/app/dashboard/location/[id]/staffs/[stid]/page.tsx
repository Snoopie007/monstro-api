
import { db } from "@/db/db";
import { notFound } from "next/navigation";
import { StaffProfile, StaffEmail } from "./components";

async function getStaffLocation(stid: string, lid: string) {
    try {
        const sl = await db.query.staffLocations.findFirst({
            where: (staffLocations, { eq, and }) => and(
                eq(staffLocations.staffId, stid),
                eq(staffLocations.locationId, lid)
            ),
            with: {
                staff: true,
                roles: {
                    with: {
                        role: true,
                    },
                },
            },
        });
        return sl;
    } catch (error) {
        console.error("Error fetching staff:", error);
        return undefined;
    }
}


interface StaffPageProps {
    params: Promise<{
        id: string;
        stid: string;
    }>;
}



export default async function StaffPage({ params }: StaffPageProps) {
    const { stid, id } = await params;

    const sl = await getStaffLocation(stid, id);

    if (!sl) {
        return notFound();
    }

    const { staff } = sl;

    return (
        <div>
            <div className="max-w-3xl mx-auto w-full space-y-4">
                <StaffProfile staff={staff} lid={id} />
                <StaffEmail staff={staff} lid={id} />
            </div>
        </div>
    );
}