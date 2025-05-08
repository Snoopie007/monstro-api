import { LocationSideNav, LocationTopNav } from "./components";
import { cn } from "@/libs/utils";
import { AccountStatusProvider } from "./providers/AccountStatusProvider";
import { decodeId } from "@/libs/server/sqids";
import { db } from "@/db/db";
import { redirect } from "next/navigation";
import "@public/editor.css";

interface LocationLayoutProps {
    children: React.ReactNode,
    params: Promise<{ id: string }>
}

async function getLocationState(lid: string) {
    const locationState = await db.query.locationState.findFirst({
        where: (locationState, { eq }) => eq(locationState.locationId, decodeId(lid))
    })
    return locationState
}


export default async function LocationLayout(props: LocationLayoutProps) {
    const params = await props.params;
    const { children } = props;
    const locationState = await getLocationState(params.id)

    if (!locationState) {
        redirect("/dashboard/locations")
    }

    return (
        <main className={cn("min-h-screen max-h-screen h-screen  flex flex-col w-full  bg-background")}>
            <AccountStatusProvider locationState={locationState}>
                <LocationTopNav lid={params.id} />
                <div className="relative flex flex-1 flex-row justify-start items-start  w-full">
                    <LocationSideNav lid={params.id} />
                    <div className="flex-1 h-full">
                        {children}
                    </div>
                </div>
            </AccountStatusProvider>
        </main>

    )
}
