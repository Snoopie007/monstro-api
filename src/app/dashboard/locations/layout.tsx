
import { cn } from "@/libs/utils";
import { LocationsNav } from "./components";


interface LocationLayoutProps {
    children: React.ReactNode,
}



export default async function LocationsLayout(props: LocationLayoutProps) {

    const { children } = props;



    return (
        <main className={cn("min-h-screen max-h-screen h-screen overflow-hidden flex flex-col w-full  bg-background")}>
            <LocationsNav />
            <div className="relative flex flex-1 flex-row justify-start items-start  w-full">

                <div className="flex-1 h-full">
                    {children}
                </div>
            </div>
        </main>

    )
}
