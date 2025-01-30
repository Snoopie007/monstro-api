'use client'
import { cn } from '@/libs/utils'

import { Elements } from '@stripe/react-stripe-js'
import { formatAmountForDisplay, getStripe } from "@/libs/stripe";
import { useState } from 'react'
import PlanBuilderPayment from './vendor-payment';
import Image from 'next/image';
import { motion } from 'framer-motion'
import { Addon, MonstroPlan, UserSelection } from '../dummy-data';

import { RadioBox, RadioBoxList, RadioBoxItem, RadioBoxPrice, RadioBoxTitle } from '@/components/ui/radio-box';
import { Badge } from '@/components/ui';


export default function VendorPlanBuilder({ plans }: { plans: MonstroPlan[] }) {
    const [userSelection, setUserSelection] = useState<UserSelection>({ plan: null, paymentPlan: null });

    function isPlan(id: number) {
        if (!userSelection.plan) return false;
        return userSelection.plan.id === id;
    }

    function isPaymentPlan(name: string) {
        if (!userSelection.paymentPlan) return false;
        return userSelection.paymentPlan.name === name;
    }

    // function isAddon(id: number) {
    //     if (!userSelection.addon) return false;
    //     return userSelection.addon.id === id;
    // }

    return (
        <div className='space-y-6 py-10'>
            <div className=" space-y-1">
                <h1 className="text-3xl text-center text-black font-poppins font-bold">Choose Your Plan</h1>
                <p className="text-center text-base text-muted-foreground">Choose a launcher plan that best fits your need.</p>
            </div>
            <motion.section className='sm:px-0 px-5' initial={{ opacity: 0 }} animate={{ opacity: 1 }} >
                <div className="mb-1">
                    <Image src="/images/vendor/monstro-start.webp" alt="Monstro Plan" className='m-auto' width={180} height={100} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4 ">
                    {plans.map((plan) => (
                        <RadioBox key={plan.id} value={plan.id} selected={isPlan(plan.id)} onSelectChange={() => setUserSelection({ ...userSelection, plan: plan })}>
                            <div className='space-y-2'>
                                <RadioBoxTitle>{plan.name}</RadioBoxTitle>
                                <RadioBoxPrice >{formatAmountForDisplay(plan.price, "usd", false)}</RadioBoxPrice>
                                <RadioBoxList className='mt-4'>
                                    {plan.benefits.map((benefit, index) => (
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
                className={cn("hidden sm:px-0 px-5", userSelection.plan && "block")}>
                <div className="mb-2 ">

                    <Image src="/images/vendor/monstro-choose-plan.webp" alt="Plan Builder" className='m-auto' width={180} height={100} />
                </div>
                <div className="grid sm:grid-cols-3 gap-3 mb-6">
                    {userSelection.plan && userSelection.plan.paymentPlans.map((p, i) => (
                        <RadioBox key={i} value={p.name} selected={isPaymentPlan(p.name)} onSelectChange={() => setUserSelection({ ...userSelection, paymentPlan: p })}>
                            <div className='space-y-2'>
                                <RadioBoxTitle>{p.name}</RadioBoxTitle>

                                <p className="text-sm text-gray-600">
                                    {p.description}
                                </p>
                                <div className='flex flex-wrap gap-1'>
                                    {p.bonuses.map((bonus, i) => (
                                        <Badge key={i} className='text-xs bg-indigo-500 rounded-sm'>
                                            {bonus}
                                        </Badge>
                                    ))}

                                </div>
                            </div>
                        </RadioBox>
                    ))}
                </div>

            </motion.section>
            {/* <motion.section
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{
                    delay: 0.1, type: 'spring', bounce: 0.4, stiffness: 420, duration: 0.8
                }}
                className={cn("hidden sm:px-0 px-5", userSelection.paymentPlan && "block")}>
                <div className="mb-2 ">

                    <Image src="/images/vendor/monstro-choose-addon.webp" alt="Plan Builder" className='m-auto' width={180} height={100} />
                </div>
                <div className="grid sm:grid-cols-3 gap-3 mb-6">
                    {addons.map((addon, i) => (
                        <RadioBox key={i} value={addon.name} selected={isAddon(addon.id)} onSelectChange={() => setUserSelection({ ...userSelection, addon: addon })}>
                            <div className='space-y-2'>
                                <RadioBoxTitle>{addon.name}</RadioBoxTitle>
                                <RadioBoxPrice>{addon.price}</RadioBoxPrice>
                                <p className="text-sm text-gray-600">{addon.description}</p>
                            </div>
                        </RadioBox>
                    ))}
                </div>
            </motion.section> */}
            {userSelection.paymentPlan && (
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
                    <PlanBuilderPayment userSelection={userSelection} />
                </Elements>
            )}
        </div>
    )
}
