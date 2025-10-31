'use client'

import { motion } from 'framer-motion'
import { VendorPayment } from './VendorPayment'
import { useState } from 'react'
import { cn, sleep } from '@/libs/utils'
import { PlanSelector } from '../../../components'
import { Button } from '@/components/ui'
import { Loader2 } from 'lucide-react'
import { useNewLocation } from '../provider/NewLocationContext'



export function VendorPlanBuilder({ lid }: { lid: string }) {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false);
    const { locationState, updateLocationState, plans } = useNewLocation()




    async function handleNext() {
        setLoading(true);
        await sleep(1000);
        setLoading(false);
        setStep(2);

    }

    function handlePlanSelect(id: number) {
        updateLocationState({
            ...locationState,
            planId: id
        });
    }

    return (
        <div className="py-4">

            <AnimatedSection className={cn("space-y-2", { hidden: step !== 1 })}>
                <div className="text-lg font-semibold">Select your plan</div>
                <PlanSelector onSelect={handlePlanSelect} value={locationState.planId} plans={plans} />

                <div className="flex flex-row justify-end">

                    <Button variant={"primary"}
                        size="lg"
                        onClick={handleNext}
                        disabled={!locationState.planId}
                    >
                        {loading ? <Loader2 className="size-4 animate-spin " /> : "Next"}

                    </Button>
                </div>
            </AnimatedSection>
            <AnimatedSection className={cn("space-y-4", { hidden: step !== 2 })}>
                <div className='text-lg font-semibold'>Payment details</div>
                <VendorPayment lid={lid} />
            </AnimatedSection>
        </div>
    )
}

function AnimatedSection({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={className}
        >
            {children}
        </motion.div>
    )
}
