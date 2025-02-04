

import { CameraIcon, Trash2Icon, UploadCloudIcon } from "lucide-react";
import React, { useRef } from 'react'
import Image from "next/image";
import { postFile } from "@/libs/api";


interface UserAvatarProps {
    currentAvatar: string | null;
    onChange: (url: string) => void;
    locationId: string
}

export default function UserAvatar({ currentAvatar, onChange, locationId }: UserAvatarProps) {
    const fileRef = useRef<HTMLInputElement | null>(null)

    async function uploadLogo() {
        const file = fileRef.current?.files?.[0]
        if (!file) return;
        const data = new FormData()
        data.append("file", file)
        data.append("fileDirectory", 'business-logo');
        try {
            const upload = await postFile({ url: 's3-upload', data: data, id: locationId });
            console.log(upload);
            onChange(upload.url);
            // updateMember({ avatar: avatar.fileUrl })
        } catch (error) {
            console.log(error)
        }
    }

    async function removeLogo() {

    }

    return (
        <div className="border-b pb-4 mb-4">

            <input type='file' ref={fileRef} onInput={uploadLogo} className='hidden' />
            {currentAvatar ? (

                <div className='avatar group shrink relative items-end flex'>
                    {/* <Image src={currentAvatar ? currentAvatar : ''}
                        width={100}
                        height={100}
                        className="aspect-square"
                        priority={true}
                        alt='member avatar' /> */}
                    <div className="flex">
                        <div onClick={() => { fileRef.current?.click() }} className='cursor-pointer'>
                            <UploadCloudIcon size={16} className='mr-2 ' />
                        </div>
                        <div onClick={removeLogo} className='cursor-pointer'>
                            <Trash2Icon size={16} className='mr-2' />
                        </div>
                    </div>

                </div>


            ) : (
                <div className="flex flex-row gap-6 items-center">
                    <div className='flex-1  border h-[80px] border-dashed rounded-sm cursor-pointer group:hover:border-white  flex flex-row items-center justify-center'
                        onClick={() => { fileRef.current?.click() }}>
                        <span><CameraIcon size={30} className='inline-block stroke-accent' /></span>
                    </div>
                    <div className="flex-1">
                        <b className="font-semibold text-base">
                            Upload Profile Picture
                        </b>
                        <p className="text-xs mt-1 leading-5">
                            The proposed size is 350px * 180px. No bigger than 2.5 MB. Only PNG, JPG, JPEG are allowed.
                        </p>
                    </div>

                </div>
            )}
        </div>
    )
}
