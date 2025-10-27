'use client'

import { motion } from 'framer-motion'
import { VendorPayment } from './VendorPayment'
import { useState } from 'react'
import { cn, sleep } from '@/libs/utils'
import PlanList from './PlanList'
import PackageList from './PackageList'
import { Button } from '@/components/ui'
import { Loader2 } from 'lucide-react'
import { useNewLocation } from '../provider/NewLocationContext'


const TABS = [
    {
        name: "Plans",
        desc: "Plans are Monstro-X monthly subscriptions that provides access to all Monstro-X features.",
        value: "plan",
    },
    {
        name: "Packages",
        desc: "Packages includes Monstro-X monthly subscriptions but bundles in a proven system to help you grow your business.",
        value: "package",
    }
]



export function VendorPlanBuilder({ lid }: { lid: string }) {
    const [step, setStep] = useState(1)
    const [tab, setTab] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { locationState, updateLocationState } = useNewLocation()



    function handleTabChange(tab: string) {
        console.log("handleTabChange", tab);
        setTab(tab);
        updateLocationState({
            ...locationState,
            planId: null,
            pkgId: null,
            paymentPlanId: null
        });
    }

    async function handleNext() {
        setLoading(true);
        await sleep(1000);
        setLoading(false);
        setStep(2);

    }

    return (
        <div className="space-y-4 py-4">

            <div className={cn("space-y-2", { hidden: step === 2 })} >
                <div className='text-lg font-semibold'>Choose between plans and packages</div>
                <AnimatedSection>
                    <div className="space-y-4">

                        <div className='grid grid-cols-2 gap-2'>
                            {TABS.map((tabItem) => (
                                <div key={tabItem.name}
                                    onClick={(e) => handleTabChange(tabItem.value)}
                                    className={cn(
                                        "border-2 border-foreground/20  space-y-4 rounded-lg p-4 opacity-80 cursor-pointer",
                                        "hover:border-indigo-500 hover:opacity-100 hover:text-indigo-500",
                                        {
                                            "opacity-100 border-indigo-500 text-indigo-500": tabItem.value === tab,
                                        }
                                    )}
                                >
                                    <div className='text-lg font-semibold'>{tabItem.name}</div>
                                    <p className='text-sm text-muted-foreground'>{tabItem.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </AnimatedSection>
            </div>
            <div className={cn("space-y-2", { hidden: step === 2 || !tab })}>

                <AnimatedSection>
                    <div className='space-y-4'>

                        {tab === "plan" && <PlanList />}
                        {tab === "package" && <PackageList />}
                        <div className="flex flex-row gap-2 ">

                            <Button
                                variant={"continue"} className={cn("children:hidden", {
                                    "children:inline-block": loading,
                                })}
                                onClick={handleNext}
                                disabled={!locationState.planId && !locationState.paymentPlanId}
                            >
                                <Loader2 className="size-4 animate-spin mr-1" />
                                Next
                            </Button>
                        </div>
                    </div>
                </AnimatedSection>
            </div>
            <div className={cn("space-y-2", { hidden: step !== 2 })}>
                <div className='text-lg font-semibold'>Payment details</div>
                <AnimatedSection>
                    <VendorPayment lid={lid} />
                </AnimatedSection>
            </div>
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
