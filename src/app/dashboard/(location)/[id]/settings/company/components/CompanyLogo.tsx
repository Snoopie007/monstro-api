import { CameraIcon, Trash2Icon, UploadCloudIcon } from "lucide-react";
import React, { useRef } from 'react'
import Image from "next/image";
import { Button } from "@/components/ui";
import { tryCatch } from "@/libs/utils";

export default function CompanyLogo({ logo, setLogoUrl, locationId }: { logo: string, setLogoUrl: Function, locationId: number }) {
    const fileRef = useRef<HTMLInputElement | null>(null)

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
        setLogoUrl(data.url);
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
        <div className="border-b pb-4 mb-4">
            <input type='file' ref={fileRef} onInput={uploadLogo} className='hidden' />

            <div className="flex flex-row gap-6 items-center">
                {logo ? (
                    <>
                        <div className='avatar group shrink relative items-end flex'>
                            <Image src={logo} width={100} height={100} className="aspect-square bg-gray-200 rounded-full" priority={true} alt='company logo' />
                        </div>
                        <div className="flex-1 flex flex-col gap-3">
                            <LogoUploadInfo />
                            <div className="flex gap-2">
                                <Button variant="outline" size="xs" onClick={() => fileRef.current?.click()}>
                                    <UploadCloudIcon size={16} className='mr-2' /> Upload
                                </Button>
                                <Button variant="destructive" size="xs" onClick={() => setLogoUrl("")}>
                                    <Trash2Icon size={16} className='mr-2' /> Remove
                                </Button>
                            </div>
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
        </div>
    )
}
