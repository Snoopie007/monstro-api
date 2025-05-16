
import { SupportTicket } from "@/types";
import Link from "next/link";
import TicketList from "./components/TicketList";
import { Button } from "@/components/ui";


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
        <div className="max-w-4xl w-full m-auto mt-6">
            <div className="border-b  mb-4 pb-4 flex flex-row justify-between items-center">
                <div className="flex flex-col">
                    <h1 className="text-lg font-semibold">Monstro Support Center</h1>
                    <p className="text-sm text-gray-500">Request and manage your support requests.</p>
                </div>
                <div>
                    <Button variant="foreground" asChild >
                        <Link href={"/dashboard/support/create-ticket"} >
                            Create Ticket
                        </Link>
                    </Button>
                </div>
            </div>

            <TicketList tickets={tickets} />
        </div >
    )
}
