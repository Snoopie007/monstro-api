
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Book, CircleHelp, Mail, Phone, Webcam } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";

const SupportButtonStyle = 'text-foreground hover:bg-transparent hover:border-foreground rounded-sm'
const SupportURL = 'https://support.mymonstroapp.com'


export function SupportMenu() {
    const { data: session } = useSession()


    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant='ghost' size='icon' className='size-6'>
                    <CircleHelp size={14} className="" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className="w-[350px] ">
                <div className="py-4 px-2 space-y-3">
                    <div className="text-sm font-medium">
                        Need help with your location?
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                            For issues with your location, automation, or payments.
                        </p>
                        <div className="flex flex-row gap-2">
                            <Button variant='outline' size='xs' className={SupportButtonStyle} asChild>
                                <Link href={`${SupportURL}/cases`}>
                                    <Mail size={14} className="mr-1" />
                                    Contact Support
                                </Link>
                            </Button>
                            <Button variant='outline' size='xs' className={SupportButtonStyle} asChild>
                                <Link href={`${SupportURL}/docs`}>
                                    <Book size={14} className="mr-1" />
                                    Doc
                                </Link>
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                            Being on the premium plans, you're eligible for priority support and zoom or phone support.
                        </p>
                        <div className="flex flex-row gap-2">
                            <Button variant='outline' size='xs' className={SupportButtonStyle} asChild>
                                <Link href={`${SupportURL}/booking/zoom`}>
                                    <Webcam size={14} className="mr-1" />
                                    Book a Zoom Call
                                </Link>
                            </Button>
                            <Button variant='outline' size='xs' className={SupportButtonStyle} asChild>
                                <Link href={`${SupportURL}/booking`}>
                                    <Phone size={14} className="mr-1" />
                                    Book a Call
                                </Link>
                            </Button>
                        </div>
                    </div>
                    <div className="bg-foreground/5 border border-foreground/10 rounded-sm p-2 text-xs text-muted-foreground ">
                        Expected response time is based on your billing plan.
                        Support hours are 9am-6pm EST Mon-Fri. We're off on all public holidays.
                    </div>
                </div>

                <DropdownMenuSeparator />

                <div className="px-2 py-4 space-y-3">
                    <div className="space-y-1">
                        <div className="text-sm font-medium">
                            Reach out to our community
                        </div>
                        <p className="text-xs text-muted-foreground">
                            For other support, including questions on our client libraries, advice, or best practices.
                        </p>
                    </div>
                    <div className="relative rounded-sm overflow-hidden h-[90px]">
                        <div className="absolute inset-0 bg-black/20 z-10" />
                        <Image
                            src="/images/fb-bg-small.webp"
                            alt="Monstro"
                            width={450}
                            height={120}
                            className="object-cover h-[90px] w-full"
                        />
                        <Button size="xs" variant="foreground"
                            className="flex flex-row gap-2 absolute z-20 top-[20px] left-[10px]"
                            asChild
                        >
                            <Link href="https://www.facebook.com/groups/monstromembers" target="_blank">
                                Join our Facebook group
                            </Link>
                        </Button>
                    </div>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
