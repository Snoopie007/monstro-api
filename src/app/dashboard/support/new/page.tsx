import { auth } from '@/auth';

import { NewCase } from './components';
import { AIBox } from './components/AIBox';
import Image from 'next/image';



export default async function NewTicketPage() {


    const session = await auth();

    const locations = session?.user.locations;


    return (
        <div className='py-10'>
            <div className='max-w-[640px] m-auto space-y-6'>
                <div className='flex items-center gap-2'>
                    <Image src='/images/monstro-icon.webp' alt='' width={24} height={24} />
                    <p className='text-base font-medium'>Monstro Support</p>
                </div>
                <AIBox />
                <NewCase locations={locations} />
                <div className='border rounded-sm p-4 text-sm space-y-2 border-foreground/10'>
                    <p className='font-medium'>Having trouble submitting the form?</p>
                    <p>Email us at <a href='mailto:support@mymonstro.com' className='text-foreground'>support@mymonstro.com</a></p>
                    <p>Please, make sure to include your location ID and as much information as possible.</p>
                </div>
            </div>
        </div >
    )
}
