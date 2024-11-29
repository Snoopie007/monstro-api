
'use client'
import {
    Card,
    CardHeader,
    CardContent,
    CardTitle,
} from "@/components/ui"


interface MemberFamiliesProps {
    params: { id: string, mid: number }
}

export function MemberFamilies({ params }: MemberFamiliesProps) {

    return (
        <Card className='rounded-sm'>
            <CardHeader className='border-b space-y-0 p-0 flex justify-between flex-row items-center ' >
                <CardTitle className="text-sm  px-4">
                    Family Members
                </CardTitle>



            </CardHeader>
            <CardContent className='p-0' >
                <div>Coming Soon!</div>
            </CardContent>
        </Card >
    )
}
