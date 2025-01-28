'use client'
import { cn, formatAmountForDisplay, sleep } from '@/libs/utils'

import { useEffect, useState } from 'react'
import Image from 'next/image';
import { motion } from 'framer-motion'
import { Program } from '@/types';
import { registerMember } from '@/libs/api';
import { signIn } from 'next-auth/react';
import { toast } from 'react-toastify';
import { RadioBox, RadioBoxItem, RadioBoxList, RadioBoxPrice, RadioBoxTitle } from '@/components/ui/radio-box';
import { useRouter } from 'next/navigation';


export default function PlanBuilder({ programs, locationId }: { programs: Program[], locationId: string }) {
    const router = useRouter();
    const [selectedProgram, setSelectedProgram] = useState<Program | null>();

    useEffect(() => {
        let registrationDetails: string | null = window.localStorage.getItem("registrationDetails");
        if (!registrationDetails)
            router.push(`/clubs/${locationId}/register/`);
    }, [])


    function isProgram(id: number) {
        if (!selectedProgram) return false;
        return selectedProgram.id === id;
    }

    const confrimPlan = async (planId: number | undefined) => {
        let registrationDetails: any = window.localStorage.getItem("registrationDetails");

        if (registrationDetails) {
            registrationDetails = JSON.parse(registrationDetails);
            await registerMember({
                programId: selectedProgram?.id,
                ...registrationDetails
            });

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
                method: "POST",
                headers: {
                    "Content-type": "application/json",
                },
                body: JSON.stringify({
                    email: registrationDetails.email,
                    password: registrationDetails.password,
                }),
            });

            const response = await res.json();
            const user = await response.data;


            if (user.vendor) {
                user.role = "vendor"
            } else if (user.member) {
                user.role = "member"
            } else {
                user.role = null
            }

            if (res.ok) {
                await sleep(1000);
                const result = await signIn("credentials", {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    image: user.avatar,
                    phone: user.phone,
                    token: user.token,
                    locations: JSON.stringify(user.locations),
                    callbackUrl: `/clubs/${locationId}/register/plan/${planId}/contract`,
                    redirect: true,

                }).then((res) => { }).catch((error) => { });

            } else {
                console.log("error");
                toast.error("Invalid email or password.");
            }
        }
    }


    return (
        <>
            <motion.section className='sm:px-0 px-5' initial={{ opacity: 0 }} animate={{ opacity: 1 }} >

                <div className="mb-2 ">

                    <Image src="/images/start-icon.webp" alt="Choose Program" className='m-auto' width={180} height={100} />
                </div>
                <div className={cn("grid gap-4", {
                    "sm:grid-cols-2": programs.length === 2,
                    "sm:grid-cols-3": programs.length === 3 || programs.length > 3
                })}>
                    {programs.map((program, i) => (
                        <RadioBox hasRadio={false} key={i} value={program.id} selected={isProgram(program.id)} onSelectChange={() => setSelectedProgram(program)}>
                            <div className='space-y-2'>
                                <RadioBoxTitle>{program.name}</RadioBoxTitle>
                                <p className='text-inherit  text-sm'>{program.description}</p>
                                {/* <RadioBoxList className='mt-4'>
                                    {program.benefits.map((benefit, index) => (
                                        <RadioBoxItem key={index} >
                                            {benefit}
                                        </RadioBoxItem>
                                    ))}
                                </RadioBoxList> */}

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
                className={cn("hidden mt-10 sm:px-0 px-5", selectedProgram && "block")}>
                <div className="mb-3 ">

                    <Image src="/images/continue-icon.webp" alt="Choose Plan" className='m-auto' width={180} height={100} />
                </div>
                <div>
                    <div className="grid sm:grid-cols-3 gap-3">
                        {selectedProgram?.plans && selectedProgram.plans.map((plan, i) => (
                            <RadioBox hasRadio={false} key={i} value={plan.id} onSelectChange={() => {
                                confrimPlan(plan.id)
                            }}>
                                <div className='space-y-2'>
                                    <RadioBoxTitle>{plan.name}</RadioBoxTitle>
                                    <RadioBoxPrice >
                                        {formatAmountForDisplay(plan.pricing.amount, "usd", false)}
                                        <span className='text-sm font-normal text-gray-600'>
                                            {plan.pricing.billingPeriod?.toLowerCase() !== 'One Time' && `/ ${plan.pricing.billingPeriod}`}
                                        </span>
                                    </RadioBoxPrice>
                                </div>

                            </RadioBox>
                        ))}
                    </div>

                </div>
            </motion.section>
        </>
    )
}
