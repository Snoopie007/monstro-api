'use client'
import { CameraIcon, Loader2, Trash2 } from "lucide-react";
import React, { useRef, useState } from 'react'
import Image from "next/image";
import { Button, Card, CardFooter } from "@/components/ui";
import { tryCatch } from "@/libs/utils";
import { toast } from "react-toastify";

export default function CompanyLogo({ logo, locationId }: { logo: string | null, locationId: number }) {
    const fileRef = useRef<HTMLInputElement | null>(null)
    const [loading, setLoading] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string | null>(logo);
    async function uploadLogo() {
        const file = fileRef.current?.files?.[0]
        if (!file) return;

        const formData = new FormData()
        formData.append("file", file)
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${locationId}/vendor/company/logo`, {
                method: "POST",
                body: formData
            })
        )
        if (error || !result) {
            toast.error("Failed to upload logo");
        };
        const data = await result?.json();
        setLogoUrl(data?.url);
    }

    async function removeLogo() {
        setLoading(true);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${locationId}/vendor/company/logo`, {
                method: "DELETE"
            })
        )
        setLoading(false);
        if (error || !result) {
            toast.error("Failed to remove logo");
        };
        setLogoUrl(null);
    }

    const LogoUploadInfo = () => (
        <div className="flex-1">
            <b className="font-semibold text-base">Upload Your Company Logo</b>
            <p className="text-xs mt-1 leading-5">
                The proposed size is 350px * 180px. No bigger than 2.5 MB. Only PNG, JPG, JPEG are allowed.
            </p>
        </div>
    )

    return (
        <Card className="rounded-sm  border-foreground/10">
            <input type='file' ref={fileRef} onInput={uploadLogo} className='hidden' />

            <div className="flex flex-row gap-10 items-center p-6">
                {logoUrl ? (
                    <>
                        <div className="flex-1 flex flex-col gap-3">
                            <LogoUploadInfo />
                            <div className="flex gap-2">
                                <Button variant="outline" size="xs" onClick={() => fileRef.current?.click()} disabled={loading} className="rounded-sm">
                                    Upload
                                </Button>
                                <Button variant="destructive" size="icon" onClick={removeLogo} disabled={loading} className="size-7">
                                    {loading ? <Loader2 className="animate-spin size-3.5" /> : <Trash2 className="size-3.5" />}
                                </Button>
                            </div>
                        </div>
                        <div className='avatar group shrink relative items-end flex'>
                            <Image src={logoUrl} width={100} height={100} className="size-[100px] bg-foreground/5 rounded-md"
                                priority={true} alt='company logo'
                                onError={() => setLogoUrl(null)}
                            />
                        </div>

                    </>
                ) : (
                    <>
                        <div
                            className='flex-1 border h-[80px] border-dashed rounded-sm cursor-pointer border-foreground/10 flex flex-row items-center justify-center'
                            onClick={() => fileRef.current?.click()}
                        >
                            {loading ? <Loader2 className="animate-spin size-3.5" /> : <CameraIcon size={30} className='text-muted-foreground/50' />}
                        </div>
                        <LogoUploadInfo />
                    </>
                )}
            </div>

        </Card>
    )
}
