'use client'

import { Icon } from "@/components/icons"

import {
    Button,

} from "@/components/ui"
import { cn, sleep } from "@/libs/utils"
import { useRouter } from "next/navigation"
import { MouseEvent, useState } from "react"
import { createContract as postContract } from "@/libs/api"


export function CreateContract({ locationId }: { locationId: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    async function createContract(e: MouseEvent) {
        e.preventDefault();
        setLoading(true);
        sleep(3000);

        const res = await postContract({
            content: '',
            title: '',
            description: '',
            isDraft: true,
            editable: true,
        }, locationId);

        const { id } = res;
        if (!id) {

        }
        setLoading(false);
        router.push(`/builder/${locationId}/contract/${id}`);
    }


    return (
        <Button variant={"foreground"} size={"xs"} className={cn("children:hidden rounded-sm", { "children:inline-block": loading })}
            onClick={createContract}>
            <Icon name="LoaderCircle" size={14} className="animate-spin mr-1" />
            Create
        </Button>
    )
}
