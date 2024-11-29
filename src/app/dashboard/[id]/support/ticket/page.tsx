import { auth } from "@/auth";

import { SupportTicket } from "@/types"
import CopyTicket from "./copy-ticket";

import MessageArea from "./message-area";

async function getTicket(id: string, locationId: string): Promise<SupportTicket | null> {
    // const res = await fetch(`/api/tickets/${id}?locationId=${locationId}`, {
    //     method: "GET",
    //     headers: {
    //         "Content-Type": "application/json",
    //         "Authorization": `Bearer ${process.env.MONSTRO_API_KEY}`,
    //     },
    //     next: {
    //         revalidate: 1
    //     }
    // });
    // const data = await res.json();
    return null;
}


export default async function TicketPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await auth()
    const locationId = params.id

    const ticket = await getTicket(params.id, locationId);

    function daysAgo(isoDateString: Date) {
        const givenDate = new Date(isoDateString);
        const currentDate = new Date();

        // Calculate the difference in time (in milliseconds)
        const timeDifference = currentDate.getTime() - givenDate.getTime();

        // Convert the time difference from milliseconds to days
        const daysDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24));

        return daysDifference;
    }
    function formatDateToMDY(dateString: Date) {
        const date = new Date(dateString);

        const day = date.getUTCDate();
        const month = date.getUTCMonth() + 1; // Months are zero-based in JavaScript
        const year = date.getUTCFullYear();

        return `${month}/${day}/${year}`;
    }
    return (
        <div className="max-w-6xl w-full m-auto mt-12" >
            {ticket ? (
                <section className=' grid grid-cols-7 gap-10'>
                    <div className='col-span-5'>
                        <div>
                            <h1 className='text-2xl font-bold'>{ticket.subject}</h1>
                            <p className="text-base mt-1.5   text-gray-600">
                                Last updated {formatDateToMDY(ticket.updated)} · Opened {daysAgo(ticket.created)} ago
                            </p>
                        </div>

                        <MessageArea locationId={locationId} ticket={ticket} />


                    </div>
                    <aside className='col-span-2 w-full h-full relative'>
                        <div className="flex flex-col bg-white/10 p-4 rounded-lg gap-3">
                            <div className="text-base">
                                <p className="text-xs text-gray-500">Case Number</p>
                                <b className="flex flex-row item-center  gap-2 "><span># {100 + +ticket.id}</span> <CopyTicket id={ticket.id} /></b>
                            </div>
                            <div className="text-base">
                                <p className="text-xs text-gray-500">Status</p>
                                <b className="text-sm">{ticket.status}</b>
                            </div>
                            <div className="text-base">
                                <p className="text-xs text-gray-500">Opened by</p>
                                <b className="text-sm">{ticket.vendorName}</b>
                            </div>
                        </div>
                    </aside>
                </section>
            ) : (
                <div>

                    <p>Sorry, the ticket you are looking for could not be found.</p>
                </div>
            )}

        </div>

    )
}
