
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
    params: { id: string, mid: string }
    familyMembers: FamilyMember[] | undefined
    editable: boolean
}

export function MemberFamilies({ params, familyMembers, editable }: MemberFamiliesProps) {
    const { member } = useMemberStatus()

    return (
        <Card className='border-foreground/10 border-x-0 border-y'>


            <CardHeader className='border-none px-4 py-2 bg-foreground/5' >
                <div className='flex flex-row items-center justify-between'>
                    <CardTitle className="text-sm  ">
                        Family Members
                    </CardTitle>
                    {editable && <AddChildMember parent={member} lid={params.id} />}
                </div>
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
