"use client";
import { CameraIcon, Loader2, Trash2 } from "lucide-react";
import React, { useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui";
import { tryCatch } from "@/libs/utils";
import { toast } from "react-toastify";
import { cn } from "@/libs/utils";

interface StaffAvatarProps {
    avatar: string | null;
    staffId: string;
    locationId: string;
    userId: string;
}

export function StaffAvatar({
    avatar,
    staffId,
    locationId,
    userId,
}: StaffAvatarProps) {
    const fileRef = useRef<HTMLInputElement | null>(null);
    const [loading, setLoading] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(avatar);

    async function uploadAvatar() {
        const file = fileRef.current?.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        setLoading(true);

        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${locationId}/staffs/${staffId}/avatar`, {
                method: "POST",
                body: formData,
            })
        );

        setLoading(false);

        if (error || !result) {
            toast.error("Failed to upload avatar");
            return;
        }

        const data = await result.json();
        setAvatarUrl(data?.url);
    }

    async function removeAvatar() {
        setLoading(true);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${locationId}/staffs/${staffId}/avatar`, {
                method: "DELETE",
            })
        );
        setLoading(false);
        if (error || !result) {
            toast.error("Failed to remove avatar");
        }
        setAvatarUrl(null);
    }

    const AvatarUploadInfo = () => (
        <div className="flex-1 text-left">
            <b className="font-semibold text-base">Upload Avatar</b>
            <p className="text-sm ">
                Preferred square image, at least 200x200px. No bigger than 2.5 MB. Only PNG, JPG, JPEG are allowed.
            </p>
        </div>
    );

    return (
        <div className="bg-foreground/5 rounded-lg">
            <input
                type="file"
                ref={fileRef}
                accept=".png,.jpg,.jpeg"
                onInput={uploadAvatar}
                className="hidden"
            />
            <div className="flex flex-row gap-5 p-6">
                {avatarUrl ? (
                    <>
                        <div className="avatar group shrink relative items-start  flex">
                            <Image
                                src={avatarUrl}
                                width={100}
                                height={100}
                                className="size-[100px] rounded-full object-cover bg-background"
                                priority={true}
                                alt={"staff avatar"}
                                onError={() => setAvatarUrl(null)}
                            />
                        </div>
                        <div className="flex-1 flex flex-col gap-3">
                            <AvatarUploadInfo />
                            <div>
                                <Button
                                    variant="destructive"
                                    onClick={removeAvatar}
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="animate-spin size-4" /> : 'Remove'}
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div
                            className={cn(
                                "flex-1 border h-[80px] border-dashed rounded-full",
                                "cursor-pointer border-foreground/10 flex flex-row items-center justify-center bg-background"
                            )}
                            onClick={() => fileRef.current?.click()}
                        >
                            {loading ? <Loader2 className="animate-spin size-4" /> : <CameraIcon size={32} className="text-muted-foreground" />}
                        </div>
                        <AvatarUploadInfo />
                    </>
                )}
            </div>
        </div>
    );
}
