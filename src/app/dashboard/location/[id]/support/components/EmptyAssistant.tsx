'use client'

import { Button } from "@/components/ui/button"
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/components/ui/empty"
import { BrainCog } from "lucide-react"
import { useRouter } from "next/navigation";

export function EmptySupportAssistant({ lid }: { lid: string }) {

    const router = useRouter();
    function handleConfigure() {
        router.push(`/dashboard/location/${lid}/support/settings`)
    }

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BrainCog />
        </EmptyMedia>
        <EmptyTitle>No Support Assistant Yet</EmptyTitle>
        <EmptyDescription>
          You don't have a support assistant yet. Get started by configuring it!
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleConfigure}>Configure Support Assistant</Button>
        </div>
      </EmptyContent>

    </Empty>
  )
}
