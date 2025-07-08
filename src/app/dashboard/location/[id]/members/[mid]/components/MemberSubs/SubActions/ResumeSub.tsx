"use client";
import React, { useState } from "react";
import {
    DialogFooter,
    Button,
    DialogClose,
} from "@/components/ui";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { MemberSubscription } from "@/types/member";
import { cn, tryCatch } from "@/libs/utils";
import { useParams } from "next/navigation";

interface ResumeSubProps {
    sub: MemberSubscription;
    show: boolean;
    close: () => void;
}

export function ResumeSub({ sub, show, close }: ResumeSubProps) {
    const params = useParams();
    const [loading, setLoading] = useState(false);


    const handleSubmit = async () => {
        if (!sub?.id || !params?.id || !params?.mid) {
            toast.error("Missing required information");
            return;
        }

        setLoading(true);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${params.id}/members/${params.mid}/subs/${sub.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ resume: true }),
            })
        );

        setLoading(false);

        if (error || !result || !result.ok) {
            const errorData = await result?.json();
            toast.error(errorData.error || "Failed to resume subscription");
            return;
        }

        toast.success("Subscription resumed");
        close();
    };

    return (
        <div className={cn(show ? "block" : "hidden")}>
            <div className="p-4 pt-6 space-y-4">
                <div className="text-lg font-semibold">Resume Subscription</div>
                <p className="text-sm  text-foreground/70  leading-relaxed bg-foreground/5 rounded-md p-2">
                    This will resume the collection of payments for this subscription starting today.
                </p>
            </div>

            <DialogFooter className="bg-transparent sm:justify-between">
                <DialogClose asChild>
                    <Button
                        variant="foreground"
                        size="sm"
                        className="border-foreground/10"
                        disabled={loading}
                    >
                        Don't resume
                    </Button>
                </DialogClose>
                <Button
                    variant="continue"
                    size="sm"
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                        </>
                    ) : (
                        "Confirm"
                    )}
                </Button>
            </DialogFooter>
        </div>
    );
}
