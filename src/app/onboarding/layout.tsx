import { ReactNode } from "react";

import { ScrollArea, TooltipProvider } from "@/components/ui";
import { LocationsNav } from "../dashboard/locations/components";

export default async function OnboardingLayout({ children, }: { children: ReactNode }) {


    return (
        <main className="h-full  overflow-hidden  bg-white  text-black">
            <TooltipProvider>
                <LocationsNav />
                <ScrollArea className="h-[calc(100vh-55px)] ">
                    <div className="flex flex-col w-xl m-auto  text-foreground">
                        <div className="flex flex-col w-full py-10">
                            {children}
                        </div>
                    </div>
                </ScrollArea>
            </TooltipProvider>
        </main >
    );
}
