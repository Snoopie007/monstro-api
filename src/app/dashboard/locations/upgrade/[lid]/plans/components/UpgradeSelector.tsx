'use client'

import { useState } from 'react'
import { PlanSelector } from '../../../../components'
import { MonstroPlan } from '@/types/admin'
import {
    Button, Dialog, DialogContent,
    DialogHeader, DialogTitle, DialogDescription, DialogFooter,
    DialogTrigger
} from '@/components/ui'
import { Loader2 } from 'lucide-react'
import { LocationState } from '@/types'


interface UpgradeSelectorProps {
    lid: string;
    plans: MonstroPlan[];
    locationState: LocationState;
}
export function UpgradeSelector({ lid, plans, locationState }: UpgradeSelectorProps) {
    const [planId, setPlanId] = useState<number | null>(locationState.planId);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    function handlePlanSelect(id: number) {
        setPlanId(id);
    }

    return (
        <div className="py-4 space-y-2">

            <div className="text-lg font-semibold">Upgrade your plan</div>
            <PlanSelector onSelect={handlePlanSelect} value={planId} plans={plans} currentPlanId={locationState.planId} />

            <div className="flex flex-row justify-end">
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button variant={"primary"}
                            size="lg"
                            disabled={loading || !planId}
                        >
                            {loading ? <Loader2 className="size-4 animate-spin " /> : "Change Plan"}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Change Plan</DialogTitle>
                            <DialogDescription>Select a new plan for your location.</DialogDescription>
                        </DialogHeader>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    )
}

