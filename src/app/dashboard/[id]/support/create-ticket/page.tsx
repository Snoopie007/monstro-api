
import { auth } from '@/auth';

import TicketForm from './ticket-form';


const InputStyle = "py-6 px-4 border w-full rounded-sm border-gray-300 text-black text-base";


export default async function SupportTicket() {


    const session = await auth();



    return (
        <div className='lg:py-20'>
            <div className='max-w-2xl m-auto'>
                <div className='border rounded-sm shadow-sm '>

                    <TicketForm />

                </div>
            </div>
        </div >
    )
}
