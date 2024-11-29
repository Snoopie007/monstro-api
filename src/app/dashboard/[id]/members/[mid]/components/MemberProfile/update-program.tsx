import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui";
import { Member } from "@/types";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { useState } from "react";

interface UpdateMemberProgramProps {
    member: Member;

}

export default function UpdateMemberProgram({ member }: UpdateMemberProgramProps) {

    const [open, setOpen] = useState<boolean>(false);


    const onFormSubmit = () => {

    }



    return (
        <div className="text-center">

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger>Update Program</DialogTrigger>
                <DialogContent className="bg-white text-black-100">
                    <DialogHeader>
                        <DialogTitle>Update Member Profile</DialogTitle>
                    </DialogHeader>

                </DialogContent>
            </Dialog>
        </div>
    );
}
