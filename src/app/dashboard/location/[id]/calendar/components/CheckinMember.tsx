
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
    Button
} from "@/components/ui";
import { Member } from "@/types/member";
import { Calendar } from "lucide-react";


export function CheckinMember({ member }: { member: Member }) {
    return (
        <Dialog>
            <DialogTrigger asChild >
                <Button variant={"ghost"} size={"icon"} className="size-5 hover:bg-indigo-100">
                    <Calendar className="size-3" />
                </Button>
            </DialogTrigger>
            < DialogContent >
                <DialogHeader>
                    <DialogTitle>Checkin a Member</DialogTitle>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    )
}