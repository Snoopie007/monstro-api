'use client'
import { BsChat } from "react-icons/bs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { SupportTicket } from "@/types";
import { useRouter } from "next/navigation";

const DateFormateOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
}


export default function TicketList({ tickets }: { tickets: SupportTicket[] }) {
    const router = useRouter();
    return (
        <Table>
            <TableHeader>
                <TableRow >
                    <TableHead>Status</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Created On</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {tickets && tickets.length > 0 ? (
                    <>
                        {tickets.map((ticket) => (
                            <TableRow key={ticket.id}
                                className="a cursor-pointer"
                                onClick={() => {
                                    router.push(`/dashboard/support/ticket/${ticket.id}`)
                                }}
                            >
                                <TableCell className="font-medium">{ticket.status}</TableCell>
                                <TableCell className="text-sm">
                                    <div className="flex flex-row items-center gap-2">
                                        <span>{ticket.subject}</span>
                                        <span className="flex flex-row items-center  gap-1">
                                            <BsChat size={14} />
                                            <span className="text-sm pt-0.5">{ticket.messagesCount}</span>
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="">{new Date(ticket.updated).toLocaleString('en-US', DateFormateOptions)}</TableCell>
                                <TableCell className="">{ticket.vendorName}</TableCell>
                                <TableCell className="">{new Date(ticket.created).toLocaleString('en-US', DateFormateOptions)}</TableCell>

                            </TableRow>
                        ))}
                    </>
                ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center">No tickets found</TableCell>
                    </TableRow>
                )}
            </TableBody>

        </Table>

    )
}
