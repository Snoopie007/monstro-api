
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function UserMenu({ locationId }: { locationId: string }) {
    const session = useSession();
    const user = session.data?.user;

    async function logOut() {
        await signOut();
        location.reload()
    }
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Avatar className="ml-2  h-7 w-7">
                    <AvatarImage src={`${user.image ? user.image : ""}`} alt={user.name} />
                    <AvatarFallback className="text-xs  bg-foreground/50 text-primary-foreground  font-bold">
                        {`${user.name.charAt(0)}${user.name.charAt(user.name.indexOf(' ') + 1)}`}
                    </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>

                <DropdownMenuItem className='cursor-pointer'>
                    <Link href={`/dashboard/${locationId}/settings/profile`}>Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>Billing</DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logOut} className="bg-red-500 cursor-pointer font-medium">Logout</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
