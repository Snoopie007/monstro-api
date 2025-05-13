import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "lucide-react";
export function AddReservation() {
    return (
        <Dialog>
            <DialogTrigger asChild >
                <Button variant={"ghost"} size={"icon"} className="size-5 hover:bg-indigo-100">
                    <Calendar className="size-3" />
                </Button>
            </DialogTrigger>
            < DialogContent >
                <DialogHeader>
                    <DialogTitle>Add Reservation </DialogTitle>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    )
}