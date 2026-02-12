
import { db } from "@/db/db";
import { notFound } from "next/navigation";
import { StaffProfile, StaffEmail, StaffPassword, StaffAvatar, DangerZone } from "./components";
import { ScrollArea } from "@/components/ui";


async function getStaffLocation(stid: string, lid: string) {
    try {
        const sl = await db.query.staffsLocations.findFirst({
            where: (staffLocations, { eq, and }) => and(
                eq(staffLocations.staffId, stafId),
                eq(staffLocations.locationId, lid)
            ),
            with: {
                staff: {
                    with: {
                        user: true,
                    },
                },
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
            <ScrollArea className="h-[calc(100vh-50px)]">
                <div className="max-w-3xl mx-auto w-full  pb-20 space-y-4">
                    <StaffAvatar avatar={staff.user?.image ?? null} staffId={staff.id} locationId={id} userId={staff.userId} />
                    <StaffProfile staff={staff} lid={id} />
                    <StaffEmail staff={staff} lid={id} />
                    <StaffPassword staff={staff} lid={id} />
                    <DangerZone staff={staff} lid={id} />
                </div>
            </ScrollArea>
        </div>
    );
}
