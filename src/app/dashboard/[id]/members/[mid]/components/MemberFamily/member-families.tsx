
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
import AddFamilyMember from "./add-family-member"
import { useMember } from "../../providers/MemberContext"


interface MemberFamiliesProps {
    params: { id: string, mid: number }
}

const DummyData = [
    {
        id: 1,
        name: "John Doe",
        relationship: "Father",
        phone: "01234567890",
        email: "john.doe@example.com",
        address: "123 Main St, Anytown, USA",
        image: "https://via.placeholder.com/150",
    }
]

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
                    {DummyData.map((member, i) => (
                        <li key={i} className='border-b last-of-type:border-b-0 flex flex-row gap-4   py-3 px-4 items-center'>
                            <div className="flex flex-row gap-4 items-center">
                                <div>
                                    <Avatar className="w-20 h-20 rounded-full mx-auto">
                                        <AvatarImage src={member.image || ""} />
                                        <AvatarFallback className="text-4xl uppercase text-muted bg-foreground font-medium">
                                            {member.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-sm font-medium">{member.name}</p>
                                    <p className="text-sm text-muted-foreground">{member.relationship}</p>
                                </div>
                            </div>

                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card >
    )
}
