
import { cn } from "@/libs/utils";
import { LocationsNav } from "./components";
import { TooltipProvider } from "@/components/ui";


interface LocationLayoutProps {
    children: React.ReactNode,
}



export default async function LocationsLayout(props: LocationLayoutProps) {

    const { children } = props;

    return (
        <main className={cn("min-h-screen max-h-screen h-screen overflow-hidden flex flex-col w-full  bg-background")}>

            <TooltipProvider>
                <LocationsNav />
                <div className="relative flex flex-1 flex-row justify-start items-start  w-full">

                    <div className="flex-1 h-full">
                        {children}
                    </div>
                </div>
            </TooltipProvider>
        </main>

    )
}
