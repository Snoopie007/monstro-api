'use client'
import { cn } from '@/libs/utils'

import { Elements } from '@stripe/react-stripe-js'
import { formatAmountForDisplay, getStripe } from "@/libs/stripe";
import { CircleCheck } from 'lucide-react'
import { useState } from 'react'
import PlanBuilderPayment from './plan-payment';
import Image from 'next/image';
import { motion } from 'framer-motion'
import { MonstroPlan, MonstroLauncher } from '../dummy-data';

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
        <>
            <div className=" space-y-2">
                <h1 className="text-3xl text-center text-black font-poppins font-bold">Choose Your Plan</h1>
                <p className="text-center text-base text-muted-foreground">Choose a launcher plan that best fits your need.</p>
            </div>
            <motion.section className='sm:px-0 px-5' initial={{ opacity: 0 }} animate={{ opacity: 1 }} >
                <div className="mb-1">
                    <Image src="/images/plan-icon.png" alt="Launcher" className='m-auto' width={180} height={100} />
                </div>
                <div className="grid sm:grid-cols-3 gap-4 ">
                    {launchers.map((launcher) => (
                        <div key={launcher.id}
                            className={cn("border-2 cursor-pointer shadow-unique border-black rounded-sm text-black bg-white p-4 flex flex-col gap-2", isLauncher(launcher.id) && "border-indigo-600")}
                            onClick={() => setCurrentLauncher(launcher)}
                        >
                            <div className="flex flex-row items-center gap-2">
                                <span className="flex-initial border-2 h-4 w-4 group cursor-pointer flex-shrink-0 box-border border-black rounded-full relative" aria-hidden="true">
                                    <span className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-black opacity-0 transition-opacity duration-200 group-hover:opacity-100")}></span>
                                </span>
                                <div className="flex-1 font-bold text-base ">{launcher.name}</div>
                            </div>
                            <div className="space-y-2">
                                <div className="font-black text-4xl flex flex-row  ">
                                    <span className=" text-xl  ">$</span>
                                    {formatAmountForDisplay(launcher.price, "usd", false)}
                                </div>
                                <div className=" w-full">
                                    <ul className="flex flex-col gap-2">
                                        {launcher.benefits.map((benefit, index) => (
                                            <li key={index} className="flex flex-row gap-1 items-center ">
                                                <CircleCheck size={20} className=" fill-indigo-600 stroke-white" />
                                                <span className="text-sm font-medium">{benefit}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
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

                    <Image src="/images/launch-icon.png" alt="Plan Builder" className='m-auto' width={180} height={100} />
                </div>
                <div className="grid sm:grid-cols-3 gap-3 mb-6">
                    {plans.map((plan, i) => (
                        <div key={i}
                            className={cn(
                                "cycleBox circleRadio  bg-white !p-4 flex gap-2 flex-1 mb-3 sm:mb-0 last:mb-0",
                                isPlan(plan.name) && "active"
                            )}
                            onClick={() => setCurrentPlan(plan)}
                        >
                            <span aria-hidden="true">
                                <span></span>
                            </span>
                            <div className="py-1 px-2">
                                <div className="uppercase font-bold  mb-4 ">{plan.name}</div>
                                <div className=" mb-2 flex flex-row items-end">
                                    <span className="font-bold text-4xl flex flex-row  font-poppins">
                                        <span className="font-normal text-xl">
                                            $
                                        </span>
                                        {plan.price}
                                    </span>
                                    <span className="text-gray-600 text-sm font-normal">/month</span>
                                </div>
                                <p className="text-sm">Per billing cycle ( 4 weeks ) with 6 month term.</p>
                            </div>
                        </div>
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
        </>
    )
}
