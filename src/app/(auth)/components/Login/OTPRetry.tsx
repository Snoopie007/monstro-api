"use client"
import { Loader2 } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { sleep } from '@/libs/utils'
import { useLogin } from '../../providers';

interface OTPRetryProps {
    type: string | undefined;
}


export function OTPRetry({ type }: OTPRetryProps) {
    const [countdown, setCountdown] = useState(60);
    const { user } = useLogin();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (countdown > 0) {
            timer = setInterval(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [countdown]);

    async function resend() {
        if (countdown > 0 || loading || !user || !type) return;

        setLoading(true);

        try {
            const res = await fetch(`/api/auth/login/token`, {
                method: "PUT",
                body: JSON.stringify({ user, type })
            });

            await sleep(1000); // Add a small delay for better UX

            if (!res.ok) {
                throw new Error('Failed to resend verification code');
            }

            toast.success('Verification code sent successfully');
            setCountdown(60); // Reset countdown timer
        } catch (error) {
            console.error("Failed to resend OTP:", error);
            toast.error('Failed to send verification code. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className=' text-gray-500 items-center '>
            Didn't receive an {type === 'email' ? 'email' : 'text'}? {" "}
            {loading && <Loader2 className='size-3 animate-spin ml-1' />}
            <button
                type="button"
                className={`${countdown > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-800 cursor-pointer'} font-bold`}
                onClick={resend}
                disabled={countdown > 0 || loading}
                aria-disabled={countdown > 0 || loading}
            >
                {countdown > 0
                    ? `Resend in ${countdown}s`
                    : "Resend"}
            </button>
        </div>
    )
}
