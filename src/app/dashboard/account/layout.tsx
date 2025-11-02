
import { cn } from "@/libs/utils";
import { LocationsNav } from "../locations/components";
import { TooltipProvider } from "@/components/ui";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {

    return (
        <main className={cn("min-h-screen max-h-screen h-screen overflow-hidden flex flex-col w-full  bg-background")}>

            <TooltipProvider>
                <LocationsNav />
                <div className="relative  flex-row w-full">

                    {children}
                </div>
            </TooltipProvider>
        </main>

    )
}
