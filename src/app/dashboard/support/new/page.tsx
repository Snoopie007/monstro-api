
import { auth } from '@/auth';

import TicketForm from './TicketForm';


const InputStyle = "py-6 px-4 border w-full rounded-sm border-gray-300 text-black text-base";


export default async function NewTicketPage() {


    const session = await auth();



    return (
        <div className='lg:py-20'>
            <div className='max-w-2xl m-auto'>
                <div className='border rounded-sm shadow-xs '>

                    <TicketForm />

                </div>
            </div>
        </div >
    )
}
