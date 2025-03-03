
'use client'
import {
    Card,
    CardHeader,
    CardContent,
    CardTitle,
    Avatar,
    AvatarImage,
    AvatarFallback,
    DropdownMenu,
    DropdownMenuTrigger,
    Button,
    DropdownMenuItem,
    DropdownMenuContent,
} from "@/components/ui"
import AttachFamilyMember from "./AttachFamily"
import { useMember } from "../../providers/MemberContext"
import { FamilyMember } from "@/types/family-member"
import { useState } from "react"
import AddChildMember from "./add-child-member"


interface MemberFamiliesProps {
    params: { id: string, mid: number }
    familyMembers: Array<FamilyMember> | undefined
}

export function MemberFamilies({ params, familyMembers }: MemberFamiliesProps) {
    const { member, mutate } = useMember()
    const [attachMemberOpen, setAttachMemberOpen] = useState(false)
    const [addChildOpen, setAddChildOpen] = useState(false)

    return (
        <>
            <AttachFamilyMember open={attachMemberOpen} setOpen={setAttachMemberOpen} parent={member} locationId={params.id} />
            <AddChildMember open={addChildOpen} setOpen={setAddChildOpen} parent={member} locationId={params.id} />
            <Card className='rounded-sm'>


                <CardHeader className='border-b space-y-0 p-0 flex justify-between flex-row items-center ' >
                    <CardTitle className="text-sm  px-4">
                        Family Members
                    </CardTitle>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant={"ghost"} className="border-l text-lg rounded-none">+</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="rounded-xs" align="center">
                            <DropdownMenuItem
                                onClick={() => setAttachMemberOpen(true)}
                                className="cursor-pointer hover:bg-foreground/10 text-xs border-b border-foreground/10 rounded-xs"
                            >
                                Attach a Member
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => setAddChildOpen(true)}
                                className="cursor-pointer hover:bg-foreground/10 text-xs border-b border-foreground/10 rounded-xs"
                            >
                                Add Child Member
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardHeader>
                <CardContent className='p-0' >
                    <ul className="space-y-2 py-2">
                        {familyMembers && familyMembers.map((fM, i) => (
                            <li key={i} className='border-b border-foreground/10 last-of-type:border-b-0 flex flex-row gap-4   py-2 px-4 items-center'>
                                <div className="flex flex-row gap-4 items-center">
                                    <div>
                                        <Avatar className="w-[35px] h-[35px] rounded-full mx-auto">
                                            <AvatarImage src={fM.relatedMember?.avatar || ""} />
                                            <AvatarFallback className="text-base uppercase text-muted bg-foreground font-medium">
                                                {fM.relatedMember?.firstName.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                    <div className="flex flex-col">
                                        <p className="text-xs font-medium">{fM.relatedMember?.firstName} {fM.relatedMember?.lastName}</p>
                                        <p className="text-xs text-muted-foreground">{fM.relationship} <span className="text-muted-foreground"> - </span> [Plan Name]</p>
                                    </div>
                                </div>

                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card >
        </>

    )
}
