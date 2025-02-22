import { ReactNode } from "react";

import { OnboardingHeader } from "./components/OnboardingHeader";
import { ScrollArea, TooltipProvider } from "@/components/ui";

export default async function OnboardingLayout({ children, }: { children: ReactNode }) {


    return (
        <main className="h-full  overflow-hidden  bg-white  text-black">
            <TooltipProvider>
                <OnboardingHeader />
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
