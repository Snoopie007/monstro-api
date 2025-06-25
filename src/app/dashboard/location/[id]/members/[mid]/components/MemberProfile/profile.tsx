'use client'
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
    Button,
    Card,
    CardContent,
    CardHeader,
    Skeleton,
} from "@/components/ui";

import { ChevronLeft, Mail, PhoneCall } from "lucide-react";
import { useMemberStatus } from "../../providers/MemberContext";
import { useRouter } from "next/navigation";

interface MemberProfileProps {
    params: { id: string, mid: number }
}
export function MemberProfile({ params }: MemberProfileProps) {
    const { member } = useMemberStatus()
    const router = useRouter()


    return (
        <Card className='border-none'>

            <CardContent className='px-0' >
                <div className='flex justify-between flex-row items-center px-4 py-2'>
                    <Button variant="ghost" size="icon" onClick={() => { router.back() }} className="bg-foreground/5 size-6" >
                        <ChevronLeft className="size-4" />
                    </Button>
                    <div>


                    </div>
                </div>

                <div className="flex px-4 py-4 gap-6">
                    <div className="flex-initial relative">

                        <Avatar className="w-20 h-20 rounded-full mx-auto">
                            <AvatarImage src={member.avatar || ""} />
                            <AvatarFallback className="text-4xl uppercase text-muted bg-foreground font-medium">
                                {member.firstName.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    <div className="flex flex-initial w-[250px] ">
                        <div className="flex flex-col  text-sm gap-1.5 ">
                            <div className=" font-bold text-lg ">
                                {member.firstName} {member.lastName}

                            </div>
                            <div className="flex flex-row gap-2 items-center">

                                <Mail size={14} />
                                <span>
                                    {member.email}
                                </span>
                            </div>
                            <div className="flex flex-row gap-2 items-center">
                                <PhoneCall size={14} />
                                <span>
                                    {member.phone}
                                </span>
                            </div>
                            <div className="flex flex-row gap-2 items-center">
                                <strong> Last seen:</strong>
                                <span>
                                    {/* {formatDateTime(member.updated)} */}
                                </span>

                            </div>

                        </div>
                    </div>
                    <div className='flex-1 flex flex-col text-sm gap-2'>
                        <div className="flex flex-col">
                            <strong>Points Earned</strong>
                            <span>
                                {member.currentPoints}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <strong className=''>Points Reedemed</strong>
                            <span>
                                {member.reedemPoints}
                            </span>

                        </div>
                    </div>
                </div>

            </CardContent>
        </Card>
    )
}
