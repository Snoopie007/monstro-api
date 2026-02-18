'use client'
import { Input } from "@/components/forms/input";
import { useState } from "react";
import { Staff } from "@subtrees/types/staff";
import { tryCatch } from "@/libs/utils";
import { toast } from "react-toastify";
import { Button } from "@/components/ui";
import { Loader2 } from "lucide-react";
import { Vendor } from "@subtrees/types/vendor";

export function UserEmail({ user }: { user: Vendor | Staff }) {
    const [newEmail, setNewEmail] = useState<string>(user.email || "");
    const [loading, setLoading] = useState<boolean>(false);
    async function handleSubmit() {
        setLoading(true);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/account/settings/${user.id}/email`, {
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
        <div className="bg-foreground/5 rounded-lg">
            <div className="p-6 space-y-4">
                <div className="space-y-1">
                    <div className="text-lg font-bold">Email</div>
                    <p className="text-sm text-muted-foreground">
                        Update your email address.
                    </p>
                </div>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <div className="flex justify-end px-6 py-3 bg-foreground/5">
                <Button type="submit" size="sm" variant="foreground" disabled={loading} onClick={handleSubmit}>
                    {loading ? <Loader2 className="animate-spin size-4" /> : "Update"}
                </Button>
            </div>
        </div>
    )
}