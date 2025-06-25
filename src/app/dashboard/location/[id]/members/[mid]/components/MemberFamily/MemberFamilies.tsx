
'use client'
import {
    Card,
    CardHeader,
    CardContent,
    CardTitle,
    Avatar,
    AvatarImage,
    AvatarFallback,
} from "@/components/ui"
import { useMemberStatus } from "../../providers/MemberContext"
import { FamilyMember } from "@/types/FamilyMember"
import AddChildMember from "./AddMember"


interface MemberFamiliesProps {
    params: { id: string, mid: number }
    familyMembers: Array<FamilyMember> | undefined
}

export function MemberFamilies({ params, familyMembers }: MemberFamiliesProps) {
    const { member } = useMemberStatus()

    return (
        <Card className='border-x-0 border-y border-foreground/10'>


            <CardHeader className='border-b border-foreground/10 space-y-0  p-0 flex justify-between flex-row items-center ' >
                <CardTitle className="text-sm  px-4">
                    Family Members
                </CardTitle>
                <AddChildMember parent={member} lid={params.id} />
            </CardHeader>
            <CardContent className='p-0' >
                <ul className="space-y-2 py-2">
                    {familyMembers && familyMembers.length === 0 && (
                        <li className='text-center py-4'>
                            <p className="text-sm  text-muted-foreground">No family members found</p>
                        </li>
                    )}
                    {familyMembers && familyMembers.map((fm, i) => (
                        <li key={i} className='border-b border-foreground/10 last-of-type:border-b-0 flex flex-row gap-4   py-2 px-4 items-center'>
                            <div className="flex flex-row gap-4 items-center">
                                <div>
                                    <Avatar className="w-[35px] h-[35px] rounded-full mx-auto">
                                        <AvatarImage src={fm.relatedMember?.avatar || ""} />
                                        <AvatarFallback className="text-base uppercase text-muted bg-foreground font-medium">
                                            {fm.relatedMember?.firstName.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-xs font-medium">{fm.relatedMember?.firstName} {fm.relatedMember?.lastName}</p>
                                    <p className="text-xs text-muted-foreground">{fm.relationship} <span className="text-muted-foreground"> - </span> [Plan Name]</p>
                                </div>
                            </div>

                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card >
    )
}
