
import { ChevronLeftIcon, LogOut } from "lucide-react";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { cn } from "@/libs/utils";


interface RegistrationHeaderProps extends React.HTMLProps<HTMLDivElement> {
    backLink?: string | null;
    children?: React.ReactNode;

}

export async function RegistrationHeader({ backLink, children, className }: RegistrationHeaderProps) {
    const session = await auth();
    return (
        <div className={cn("border-b text-black flex flex-row items-center border-gray-200 w-full", className)}>

            {backLink ? (
                <Link href={backLink} className="flex  w-[100px] hover:bg-slate-900 hover:text-white  border-r py-3 px-4  border-gray-200">
                    <ChevronLeftIcon size={18} />
                    <span className="font-semibold text-sm">Back </span>
                </Link>
            ) : (
                <div className="flex  w-[100px]">
                </div>
            )}
            <div className="flex-1">
                <p className="text-xl py-3 px-4 font-semibold text-center ">
                    {children}
                </p>
            </div>
            <div className="flex w-[100px] justify-end h-full ">
                {session && (
                    <Button className="h-full w-full justify-center hover:bg-indigo-700 hover:text-white border-l rounded-none border-gray-200 py-2 gap-2 ">
                        <LogOut size={18} />
                        <span className="font-bold">Logout</span>
                    </Button>
                )}

            </div>
        </div>
    )
}
