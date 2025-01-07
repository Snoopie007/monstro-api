
'use client'
import {
    Card,
    CardHeader,
    CardContent,
    CardTitle,
} from "@/components/ui"
import AddFamilyMember from "./add-family-member"
import { useMember } from "../../providers/MemberContext"


interface MemberFamiliesProps {
    params: { id: string, mid: number }
}

export function MemberFamilies({ params }: MemberFamiliesProps) {
    const { member, mutate } = useMember()
    return (
        <Card className='rounded-sm'>
            <CardHeader className='border-b space-y-0 p-0 flex justify-between flex-row items-center ' >
                <CardTitle className="text-sm  px-4">
                    Family Members
                </CardTitle>
                <AddFamilyMember member={member} locationId={params.id} />

            </CardHeader>
            <CardContent className='p-0' >
                <ul>
                    {[].map((member, i) => (
                        <li key={i} className='border-b last-of-type:border-b-0 flex flex-row gap-4   py-3 px-4 items-center'>


                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card >
    )
}
