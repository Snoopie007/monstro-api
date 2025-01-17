'use client'
import { cn } from '@/libs/utils'

import { Elements } from '@stripe/react-stripe-js'
import { formatAmountForDisplay, getStripe } from "@/libs/stripe";
import { useState } from 'react'
import PlanBuilderPayment from './plan-payment';
import Image from 'next/image';
import { motion } from 'framer-motion'
import { MonstroPlan, MonstroLauncher } from '../dummy-data';

import { RadioBox, RadioBoxList, RadioBoxItem, RadioBoxPrice, RadioBoxTitle } from '../../../components/ui/radio-box';

export default function VendorPlanBuilder({ plans, launchers }: { plans: MonstroPlan[], launchers: MonstroLauncher[] }) {
    const [currentPlan, setCurrentPlan] = useState<MonstroPlan | null>();
    const [currentLauncher, setCurrentLauncher] = useState<MonstroLauncher | null>();

    function isLauncher(id: number) {
        if (!currentLauncher) return false;
        return currentLauncher.id === id;
    }
    function isPlan(name: string) {
        if (!currentPlan) return false;
        return currentPlan.name === name;
    }
    return (
        <div className='space-y-6 py-10'>
            <div className=" space-y-1">
                <h1 className="text-3xl text-center text-black font-poppins font-bold">Choose Your Plan</h1>
                <p className="text-center text-base text-muted-foreground">Choose a launcher plan that best fits your need.</p>
            </div>
            <motion.section className='sm:px-0 px-5' initial={{ opacity: 0 }} animate={{ opacity: 1 }} >
                <div className="mb-1">
                    <Image src="/images/start-icon.webp" alt="Launcher" className='m-auto' width={180} height={100} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4 ">
                    {launchers.map((launcher) => (
                        <RadioBox key={launcher.id} value={launcher.id} selected={isLauncher(launcher.id)} onSelectChange={() => setCurrentLauncher(launcher)}>
                            <div className='space-y-2'>
                                <RadioBoxTitle>{launcher.name}</RadioBoxTitle>
                                <RadioBoxPrice >{formatAmountForDisplay(launcher.price, "usd", false)}</RadioBoxPrice>
                                <RadioBoxList className='mt-4'>
                                    {launcher.benefits.map((benefit, index) => (
                                        <RadioBoxItem key={index} >

                                            {benefit}
                                        </RadioBoxItem>
                                    ))}
                                </RadioBoxList>
                            </div>
                        </RadioBox>

                    ))}
                </div>
            </motion.section>
            <motion.section
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{
                    delay: 0.1, type: 'spring', bounce: 0.4, stiffness: 420, duration: 0.8
                }}
                className={cn("hidden sm:px-0 px-5", currentLauncher && "block")}>
                <div className="mb-2 ">

                    <Image src="/images/plan-icon.png" alt="Plan Builder" className='m-auto' width={180} height={100} />
                </div>
                <div className="grid sm:grid-cols-3 gap-3 mb-6">
                    {plans.map((plan, i) => (
                        <RadioBox key={i} value={plan.name} selected={isPlan(plan.name)} onSelectChange={() => setCurrentPlan(plan)}>
                            <div className='space-y-2'>
                                <RadioBoxTitle>{plan.name}</RadioBoxTitle>
                                <RadioBoxPrice>{plan.price}</RadioBoxPrice>
                                <p className="text-sm text-gray-600">Per billing cycle ( 4 weeks ) with 6 month term.</p>
                            </div>
                        </RadioBox>
                    ))}
                </div>
            </motion.section>
            {currentPlan && currentLauncher && (
                <Elements
                    stripe={getStripe()}
                    options={{
                        appearance: {
                            variables: {
                                colorIcon: "#6772e5",
                                fontFamily: "Roboto, Open Sans, Segoe UI, sans-serif",
                            },
                        },
                    }}
                >
                    <PlanBuilderPayment plan={currentPlan} launcher={currentLauncher} />
                </Elements>
            )}
        </div>
    )
}
