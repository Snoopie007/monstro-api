
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
import { CreditCard, User } from "lucide-react";
import { cn } from "@/libs/utils";
import { useTheme } from "next-themes";


const MenuItemStyle = 'flex flex-row items-center justify-start text-xs hover:bg-foreground/5'

export function UserMenu() {
    const session = useSession();
    const user = session.data?.user;
    const { theme, setTheme } = useTheme();

    async function logOut() {
        await signOut();
        location.reload()
    }
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Avatar className="ml-2 h-7 w-7">
                    <AvatarImage src={`${user.image ? user.image : ""}`} alt={user.name} />
                    <AvatarFallback className="text-xs  bg-foreground/50 text-primary-foreground  font-bold">
                        {`${user.name.charAt(0)}${user.name.charAt(user.name.indexOf(' ') + 1)}`}
                    </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className="w-60 rounded-sm shadow-sm">
                <DropdownMenuItem className={"flex flex-col items-start justify-start text-xs"}>
                    <span className=" font-semibold">{user.name}</span>
                    <span className=" text-muted-foreground">
                        {user.email}
                    </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className={MenuItemStyle} asChild>
                    <Link href={`/dashboard/account/profile`} >
                        <User className="size-3 mr-1.5" />
                        Profile
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className={MenuItemStyle} asChild>
                    <Link href={`/dashboard/account/billing`} >
                        <CreditCard className="size-3 mr-1.5" />
                        Billing
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex flex-col items-start justify-start space-y-2 focus:bg-transparent">
                    <div className="text-xs  text-foreground/70  font-semibold">Theme</div>
                    <ul className="space-y-0 justify-start w-full">
                        {['light', 'dark', 'system'].map((t) => (
                            <li key={t} className="text-xs font-medium capitalize flex items-center w-full p-1.5 hover:bg-foreground/5 rounded-sm gap-2" onClick={() => setTheme(t)}>
                                <span className="w-3.5 flex justify-center">
                                    {theme === t && <span className="size-1.5 bg-green-500 rounded-full"></span>}
                                </span>
                                <span className="text-xs">{t}</span>
                            </li>
                        ))}
                    </ul>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logOut} className={cn(MenuItemStyle, 'font-semibold')}>

                    Logout
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
