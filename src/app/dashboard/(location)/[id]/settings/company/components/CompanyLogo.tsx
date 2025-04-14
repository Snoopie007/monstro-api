'use client'
import { CameraIcon } from "lucide-react";
import React, { useRef, useState } from 'react'
import Image from "next/image";
import { Button, Card, CardFooter } from "@/components/ui";
import { tryCatch } from "@/libs/utils";

export default function CompanyLogo({ logo, locationId }: { logo: string | null, locationId: number }) {
    const fileRef = useRef<HTMLInputElement | null>(null)
    const [loading, setLoading] = useState(false);
    async function uploadLogo() {
        const file = fileRef.current?.files?.[0]
        if (!file) return;

        const formData = new FormData()
        formData.append("file", file)
        formData.append("fileDirectory", 'business-logo');

        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${locationId}/upload`, {
                method: "POST",
                body: formData
            })
        )
        if (error || !result) throw error;
        const data = await result.json();
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
                {logo ? (
                    <>
                        <div className="flex-1 flex flex-col gap-3">
                            <LogoUploadInfo />
                            <div className="flex gap-2">
                                <Button variant="outline" size="xs" onClick={() => fileRef.current?.click()}>
                                    Upload
                                </Button>
                                <Button variant="destructive" size="xs">
                                    Remove
                                </Button>
                            </div>
                        </div>
                        <div className='avatar group shrink relative items-end flex'>
                            <Image src={logo} width={100} height={100} className="aspect-square bg-gray-200 rounded-sm" priority={true} alt='company logo' />
                        </div>

                    </>
                ) : (
                    <>
                        <div
                            className='flex-1 border h-[80px] border-dashed rounded-sm cursor-pointer group:hover:border-white flex flex-row items-center justify-center'
                            onClick={() => fileRef.current?.click()}
                        >
                            <CameraIcon size={30} className='stroke-accent' />
                        </div>
                        <LogoUploadInfo />
                    </>
                )}
            </div>
            <CardFooter className="flex justify-end border-t px-6 py-3 border-foreground/10 bg-foreground/5">
                <Button variant="foreground" size="sm">
                    Save
                </Button>

            </CardFooter>
        </Card>
    )
}
