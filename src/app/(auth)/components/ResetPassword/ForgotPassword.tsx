"use client";

import { Input } from "@/components/forms/input";

import { cn, tryCatch } from "@/libs/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";;

export function ForgotPassword() {
    const [loading, setLoading] = useState<boolean>(false);
    const [email, setEmail] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [success, setSuccess] = useState<boolean>(false);


    async function reset() {
        if (!email) {
            setError("Email is required")
            return
        }
        setError("")
        setLoading(true);


        const { result, error } = await tryCatch(
            fetch("/api/auth/password/forgot", {
                method: "POST",
                body: JSON.stringify({ email })
            })
        )
        setLoading(false)
        if (!result || error || !result.ok) {
            const data = await result?.json()
            setError(data?.message || "Something went wrong")
            return
        }
        setSuccess(true)
    }

    if (success) {
        return (
            <div className="space-y-1">
                <div className="text-lg  font-bold">
                    We've sent you an email to reset your password
                </div>
                <p className="text-sm text-gray-500">
                    Please check your email for a link to reset your password
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <h1 className="text-lg  font-bold">
                    Forgot your password?
                </h1>
                <p className=" text-gray-500">
                    Enter your email address and we will send you a link to reset your password
                </p>
            </div>

            <div className="space-y-4">
                <div className="space-y-1">
                    <Input type="email" placeholder="Enter your email"
                        className={cn("	bg-white border border-gray-200 rounded-lg h-12 text-base  ", { "border-red-500": error })}
                        onFocus={() => setError("")}
                        onBlur={() => setError("")}
                        value={email} onChange={(e) => setEmail(e.target.value)} />
                    {error && (
                        <div className="text-red-500 text-sm">
                            {error}
                        </div>
                    )}
                </div>
                <div>
                    <Button type="submit"
                        disabled={loading}
                        className={cn("children:hidden", loading && "children:block")}
                        onClick={reset}
                    >
                        <Loader2 className="size-4 animate-spin mr-2" />
                        Reset Password
                    </Button>
                </div>
            </div>

        </div>
    );
}
