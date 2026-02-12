'use client'
import {
    Button,
    AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction
} from "@/components/ui";

import { tryCatch } from "@/libs/utils";
import { Loader2 } from "lucide-react";
import { Staff } from "@subtrees/types";
import { toast } from "react-toastify";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/forms";

interface DangerZoneProps {
    staff: Staff;
    lid: string;
}


export function DangerZone({ staff, lid }: DangerZoneProps) {
    const [loading, setLoading] = useState(false);
    const [confirm, setConfirm] = useState("");
    const router = useRouter();

    async function handleDelete() {
        if (confirm.trim().toLowerCase() !== `${staff.firstName} ${staff.lastName}`.trim().toLowerCase()) {
            toast.error("Please enter the correct full name.");
            return;
        }

        setLoading(true);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/staffs/${staff.id}`, {
                method: "DELETE"
            })
        );

        if (error || !result || !result.ok) {
            setLoading(false);
            toast.error("Something went wrong.");
            return;
        }

        setLoading(false);
        toast.success("Staff deleted successfully!");
        router.push(`/dashboard/location/${lid}/staffs`);
    }

    return (
        <div className="bg-destructive/50 border border-destructive rounded-lg p-6 space-y-4">

            <div className=" space-y-4">
                <div className="space-y-1">
                    <div className="text-lg font-bold">Delete Staff Account</div>
                    <p className="text-white/80">
                        Permanently delete this staff account and all associated data.
                        Please enter the full name {' '}
                        <strong className="text-yellow-400">{staff.firstName} {staff.lastName}</strong> to confirm.
                    </p>
                </div>
                <Input type="text"
                    className="bg-white text-black border border-foreground/10 rounded-lg placeholder:text-gray-500"
                    placeholder="Enter full name to confirm"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                />
            </div>
            <div className="flex justify-end">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button >
                            Delete Account
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="border-foreground/10">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure you want to delete this staff account?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. The staff account will be deleted and all associated data will be lost.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="border-foreground/10">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} disabled={loading}>
                                {loading ? <Loader2 className="size-4 animate-spin" /> : "Yes, I'm sure"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div >
    );
}
