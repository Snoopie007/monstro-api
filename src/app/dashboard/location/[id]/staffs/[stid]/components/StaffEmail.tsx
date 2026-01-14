'use client'
import { Input } from "@/components/forms/input";
import { useState } from "react";
import { Staff } from "@/types";
import { tryCatch } from "@/libs/utils";
import { toast } from "react-toastify";
import { Button } from "@/components/ui";
import { Loader2 } from "lucide-react";

interface StaffEmailProps {
    staff: Staff;
    lid: string;
}

export function StaffEmail({ staff, lid }: StaffEmailProps) {
    const [newEmail, setNewEmail] = useState<string>(staff.email || "");
    const [loading, setLoading] = useState<boolean>(false);

    async function handleSubmit() {
        setLoading(true);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/staffs/${staff.id}`, {
                method: "PUT",
                body: JSON.stringify({ email: newEmail }),
            })
        );
        if (error || !result || !result.ok) {
            toast.error("Failed to update email");
            setLoading(false);
            return;
        }
        setLoading(false);
        toast.success("Email updated successfully");
    }
    return (
        <div className="bg-foreground/5 rounded-lg p-6 space-y-4">
            <div className=" space-y-4">
                <div className="space-y-1">
                    <div className="text-lg font-bold">Email</div>
                    <p className="text-sm text-muted-foreground">
                        Update your email address.
                    </p>
                </div>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <div className="flex justify-end">
                <Button type="submit"
                    variant="foreground"
                    disabled={loading || newEmail === staff.email}
                    onClick={handleSubmit}>
                    {loading ? <Loader2 className="animate-spin size-4" /> : "Update"}
                </Button>
            </div>
        </div>
    )
}