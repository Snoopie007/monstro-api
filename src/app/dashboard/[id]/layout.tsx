import { SideNav, TopNav } from "./components/menus";
import { ScrollArea } from "@/components/ui/scroll-area";

import { cn } from "@/libs/utils";

export default async function DashLayout(
    props: {
        children: React.ReactNode,
        params: Promise<{ id: number }>
    }
) {
    const params = await props.params;

    const {
        children
    } = props;

    return (
        <main className={cn("min-h-screen max-h-screen h-screen overflow-hidden w-full  bg-background")}>
            <TopNav locationId={params.id} />
            <div className="relative flex flex-row justify-start items-start h-[calc(100vh-55px)] w-full">

                <SideNav locationId={params.id} />
                <div className="flex-1 h-full">
                    <ScrollArea className=" pb-10 h-full overflow-hidden">

                        {children}
                    </ScrollArea>
                </div>
            </div>

        </main>

    )
}
