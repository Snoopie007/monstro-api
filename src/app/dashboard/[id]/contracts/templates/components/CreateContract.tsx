'use client'

import { Icon } from "@/components/icons"

import {
    Button,

} from "@/components/ui"
import { cn, sleep, tryCatch } from "@/libs/utils"
import { useRouter } from "next/navigation"
import { MouseEvent, useState } from "react"
import { fetcher, createContract as postContract } from "@/libs/api"
import { toast } from "react-toastify"


export function CreateContract({ locationId }: { locationId: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    async function createContract(e: MouseEvent) {
        e.preventDefault();
        setLoading(true);
        sleep(3000);

        const { result, error } = await tryCatch(
            fetch(`/api/protected/${locationId}/contracts`, {
                method: "POST",
                body: JSON.stringify({
                    content: '',
                    title: '',
                    description: '',
                    isDraft: true,
                    editable: true,
                })
            })
        );

        if (error || !result || !result.ok) {
            return toast.error(error?.message || "Failed to create contract");

        }

        const data = await result.json();
        setLoading(false);

        router.push(`/builder/${locationId}/contract/${data.id}`);
    }


    return (
        <Button variant={"foreground"} size={"xs"} className={cn("children:hidden rounded-sm", { "children:inline-block": loading })}
            onClick={createContract}>
            <Icon name="LoaderCircle" size={14} className="animate-spin mr-1" />
            Create
        </Button>
    )
}
