import { Program } from '@/types';
import { Card, CardContent } from '@/components/ui/card'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
export function ProgramList({ programs, locationId }: { programs: Program[], locationId: string }) {

    if (programs.length === 0) {
        return (
            <div className='flex flex-col items-center w-full justify-center h-full'>
                <p className='text-black dark:text-gray-400 text-lg'>No programs found, please create one.</p>
            </div>
        )
    }

    return (
        <div className=" grid gap-2 ">
            {programs.map((program: any) => {
                return (
                    <Card key={program.id} className=' rounded-sm bg-background border border-gray-100'>
                        <CardContent className=' py-3 px-4  flex flex-row'>
                            <Link href={`/dashboard/${locationId}/programs/${program.id}`} className="w-full  inline-flex" >
                                <div className="flex flex-row   w-full items-center justify-between">
                                    <div className="flex-initial flex gap-3 flex-row items-center">


                                        <p className="text-sm text-foreground group-hover:text-violet-600 font-bold ">{program.name}</p>


                                        <span className='text-sm text-gray-500'>Plans: {program.planCounts}</span>
                                    </div>
                                    <ChevronRight size={20} className="stroke-black-100 group-hover:stroke-violet-600" />
                                </div>
                            </Link>
                        </CardContent>

                    </Card>

                );
            })}
        </div>
    )
}
