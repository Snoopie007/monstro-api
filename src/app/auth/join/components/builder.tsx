'use client'
import { cn } from '@/libs/utils'
import { MonstroLauncher, MonstroPlan } from '@/types'
import { Elements } from '@stripe/react-stripe-js'
import { formatAmountForDisplay, getStripe } from "@/libs/stripe";
import { CircleCheck } from 'lucide-react'
import { useState } from 'react'
import PlanBuilderPayment from './plan-payment';
import Image from 'next/image';
import { motion } from 'framer-motion'

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
            <div className="mb-10">
                <h1 className="text-3xl text-center font-poppins font-bold">Design Your Own Plan</h1>
                <p className="text-center mt-2 text-xl text-gray-700">Customize your plan, choose a launcher and a plan that best fits your need. Launchers are design to get you results almost instantly.</p>
            </div>
            <motion.section className='sm:px-0 px-5' initial={{ opacity: 0 }} animate={{ opacity: 1 }} >

                <div className="mb-2">

                    <Image src="/images/plan-icon.png" alt="Launcher" className='m-auto' width={180} height={100} />
                </div>
                <div className="grid  sm:grid-cols-2 gap-4 mb-6">
                    {launchers.map((launcher) => (
                        <div key={launcher.id}
                            className={cn(
                                "cycleBox circleRadio bg-white !p-4 flex gap-2 flex-1 mb-3 sm:mb-0 last:mb-0",
                                isLauncher(launcher.id) && "active")
                            }
                            onClick={() => setCurrentLauncher(launcher)}
                        >
                            <span aria-hidden="true">
                                <span></span>
                            </span>
                            <div className="py-1 px-2">
                                <div className="uppercase  font-bold mb-2 ">{launcher.name}</div>
                                <div className="font-bold text-4xl mb-6 flex flex-row  font-poppins">
                                    <span className="font-roboto text-2xl mr-0.5 ">$</span>
                                    {formatAmountForDisplay(launcher.price, "usd", false)}
                                </div>
                                <div className=" w-full">
                                    <ul className="flex flex-col gap-2">
                                        {launcher.benefits.map((benefit, index) => (
                                            <li key={index} className="flex items-center ">
                                                <CircleCheck size={22} className="mr-2 fill-indigo-500 stroke-white" />
                                                <span className="text-base font-semibold">{benefit}</span>
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
