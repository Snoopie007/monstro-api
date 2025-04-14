import { SideNav, TopNav } from "./components/menus";
import { cn } from "@/libs/utils";
import { AccountStatusProvider } from "./providers/AccountStatusProvider";

import { decodeId } from "@/libs/server/sqids";
import { db } from "@/db/db";
import { redirect } from "next/navigation";


interface LocationLayoutProps {
    children: React.ReactNode,
    params: Promise<{ id: string }>
}

async function getLocationState(locationId: string) {
    const locationState = await db.query.locationState.findFirst({
        where: (locationState, { eq }) => eq(locationState.locationId, decodeId(locationId))
    })
    return locationState
}


export default async function LocationLayout(props: LocationLayoutProps) {
    const params = await props.params;
    const { children } = props;
    const locationState = await getLocationState(params.id)

    if (!locationState) {
        redirect("/dashboard")
    }

    return (
        <main className={cn("min-h-screen max-h-screen h-screen overflow-hidden flex flex-col w-full  bg-background")}>
            <AccountStatusProvider locationState={locationState}>
                <TopNav locationId={params.id} />
                <div className="relative flex flex-1 flex-row justify-start items-start  w-full">
                    <SideNav locationId={params.id} />
                    <div className="flex-1 h-full">
                        {children}
                    </div>
                </div>
            </AccountStatusProvider>
        </main>

    )
}
