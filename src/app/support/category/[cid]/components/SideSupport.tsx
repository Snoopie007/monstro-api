"use client"
import { useSession } from "next-auth/react";
import Link from "next/link";
export default function SideSupport() {
    const { data: session } = useSession();
    const isOpen = () => {
        const now = new Date();
        const day = now.getUTCDay();
        const hour = now.getUTCHours() - 5; // Convert UTC to EST
        return day >= 1 && day <= 5 && hour >= 9 && hour < 18;
    };

    const url = session ? "/support/cases" : `/login?redirect=${encodeURIComponent('/support/cases')}`;
    return (
        <div>
            {isOpen() ? (
                <Link href={url} className=" text-foreground font-semibold text-sm mb-2 inline-flex items-center">
                    <span className="h-2 w-2 bg-lime-500 rounded-full mr-2" />
                    Contact support
                </Link>
            ) : (
                <div className="text-muted-foreground font-medium text-sm mb-2 inline-flex items-center cursor-not-allowed">
                    <span className="h-2 w-2 bg-red-500 rounded-full mr-2" />
                    Support Offline
                </div>
            )}
            <p className="text-sm">Contact support Monday to Friday 9AM to 6PM EST.</p>
        </div>
    );
}
