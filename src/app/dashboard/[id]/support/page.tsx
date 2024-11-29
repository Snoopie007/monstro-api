import { Input } from "@/components/forms/input";
import { SupportTicket } from "@/types";
import Link from "next/link";
import TicketList from "./ticket-list";


async function getTickets(vendorId: string): Promise<SupportTicket[]> {
    // const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tickets/`, {
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

    return [];
}


export default async function SupportPage() {
    const tickets = await getTickets("vendorId");
    return (
        <div className="max-w-5xl w-full m-auto mt-6">
            <div>
                <div className="border-b mb-4 pb-4 ">
                    <h1 className="text-2xl font-semibold font-poppins">Support Center</h1>
                    <p>Request and manage your support requests.</p>
                </div>
                <div className="flex flex-row gap-4 bg">
                    <div className="flex-1"><Input placeholder="Search..." className="rounded-sm h-auto  text-sm py-2 " /></div>
                    <Link href={"/dashboard/support/create-ticket"} className="bg-white inline-block justify-center text-sm text-black border-none font-semibold px-4 py-2 rounded-sm">
                        Create Ticket
                    </Link>

                </div>
            </div>
            <div className="border mt-4 rounded-sm ">
                <TicketList tickets={tickets} />

            </div>
        </div >
    )
}
