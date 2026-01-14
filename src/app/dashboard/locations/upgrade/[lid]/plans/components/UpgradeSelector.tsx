'use client'

import { useMemo, useState } from 'react'
import { PlanSelector } from '../../../../components'
import { MonstroPlan } from '@/types/admin'
import {
    Button,
    AlertDialog,
    AlertDialogContent,
    AlertDialogTrigger,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogCancel,
    AlertDialogFooter,
    AlertDialogAction
} from '@/components/ui'
import { Loader2 } from 'lucide-react'
import { LocationState } from '@/types'
import { sleep } from '@/libs/utils'
import { toast } from 'react-toastify'
import { useRouter } from 'next/navigation'

interface UpgradeSelectorProps {
    lid: string;
    plans: MonstroPlan[];
    locationState: LocationState;
}

export function UpgradeSelector({ lid, plans, locationState }: UpgradeSelectorProps) {
    const [planId, setPlanId] = useState<number | null>(locationState.planId);
    const [selectedPlan, setSelectedPlan] = useState<MonstroPlan | null>(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [alertOpen, setAlertOpen] = useState(false);
    const router = useRouter();
    function handlePlanSelect(id: number) {
        setPlanId(id);
        if (id === locationState.planId) {
            setSelectedPlan(null);
            return;
        }
        const plan = plans.find(plan => plan.id === id);
        if (!plan) return;
        setSelectedPlan(plan);
    }



    const isUpgradeable = useMemo(() => {
        return planId && locationState.planId && planId > locationState.planId;
    }, [planId, locationState.planId]);

    async function handleUpgrade() {
        if (!planId) return;

        setLoading(true);
        try {

            const res = await fetch(`/api/protected/account/loc/${lid}/upgrade`, {
                method: 'POST',
                body: JSON.stringify({ planId }),
            });
            if (res.ok) {
                setOpen(false);

                toast.success('Plan upgraded successfully');
            }
            await sleep(500);
            // redirect to the location page
            router.push(`/dashboard/location/${lid}`);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <>


            <div className="py-4 space-y-2">

                <div className="text-lg font-semibold">Upgrade your plan</div>
                <PlanSelector
                    onSelect={handlePlanSelect}
                    value={planId}
                    plans={plans}
                    currentPlanId={locationState.planId}
                />

                <div className="flex flex-row justify-end">
                    <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant={"primary"}
                                size="lg"
                                disabled={loading || !planId || planId === locationState.planId}
                            >
                                {loading ? <Loader2 className="size-4 animate-spin" /> : "Change Plan"}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className='border-foreground/10'>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{isUpgradeable ? "Upgrade" : "Downgrade"} Plan to {selectedPlan?.name}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to {isUpgradeable ? "upgrade" : "downgrade"} your plan to {selectedPlan?.name}?
                                    Changes will take effect immediately, a pro-rated amount will be charged on your next billing cycle.
                                </AlertDialogDescription>
                            </AlertDialogHeader>

                            <AlertDialogFooter>
                                <AlertDialogCancel className='border-foreground/10'>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleUpgrade}
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="size-4 animate-spin" /> : "Confirm"}
                                </AlertDialogAction>
                            </AlertDialogFooter>


                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        </>
    )
}

