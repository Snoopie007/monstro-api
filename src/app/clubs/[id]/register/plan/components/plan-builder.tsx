'use client'
import { cn, sleep } from '@/libs/utils'

import { useEffect, useState } from 'react'
import Image from 'next/image';
import { motion } from 'framer-motion'
import { Program } from '@/types';
import { CircleCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { registerMember } from '@/libs/api';
import { signIn } from 'next-auth/react';
import { toast } from 'react-toastify';
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
                <div className="grid sm:grid-cols-2 gap-3 mb-6">
                    {programs.map((program, i) => (
                        <div key={i}
                            className={cn(
                                "cycleBox circleRadio  bg-white flex gap-2 flex-1 mb-3 sm:mb-0 last:mb-0",
                                isProgram(program.id) && "active"
                            )}
                            onClick={() => setSelectedProgram(program)}
                        >
                            <span aria-hidden="true">
                                <span></span>
                            </span>
                            <div className="py-1 px-2 text-black">
                                <div className="uppercase font-bold">{program.name}</div>
                                <p className='text-gray-900 mt-1 mb-4 text-sm'>{program.description}</p>
                                <div>
                                    <h3>Location Details</h3>
                                    <p>Name:<span> {program.location?.name}</span></p>
                                    <p>Address:<span> {program.location?.address}, {program.location?.city} {program.location?.state}</span></p>
                                    <p>Email:<span> {program.location?.email}</span></p>
                                    <p>Phone:<span> {program.location?.phone}</span></p>
                                </div>
                                <div className=" w-full">
                                    <ul className="flex flex-col gap-2">
                                        {program.benefits?.map((benefit, index) => (
                                            <li key={index} className="flex  items-start ">
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
                className={cn("hidden mt-10 sm:px-0 px-5", selectedProgram && "block")}>
                <div className="mb-3 ">

                    <Image src="/images/continue-icon.webp" alt="Choose Plan" className='m-auto' width={180} height={100} />
                </div>
                <div>
                    <div className="grid sm:grid-cols-3 gap-3 mb-6">
                        {selectedProgram?.plans && selectedProgram.plans.map((plan, i) => (
                            <div key={i}
                                className={cn("cycleBox   bg-white p-4 flex gap-2 flex-1 mb-3 sm:mb-0 last:mb-0")}
                            >

                                <div className="py-1 px-2 text-black">
                                    <div className="uppercase font-bold  ">{plan.name}</div>
                                    <p className='text-gray-900 mt-1 mb-4 text-sm'>{plan.description}</p>
                                    <div className=" mb-2 flex flex-row items-end">
                                        <span className="font-bold text-4xl flex flex-row  font-poppins">
                                            <span className="font-normal text-xl">
                                                $
                                            </span>
                                            {plan.pricing.amount}
                                        </span>
                                        {plan.pricing.billing_period !== 'One Time' ? (
                                            <span className="text-gray-600 text-sm font-normal">/{plan.pricing.billing_period}</span>
                                        ) : (
                                            <span className="text-gray-600 text-sm font-normal">{plan.pricing.billing_period}</span>
                                        )}

                                    </div>
                                    <div className='mt-3  flex flex-row justify-end w-full '>
                                        <Button onClick={() => confrimPlan(plan.id)} className="py-2.5 px-4 rounded-[4px] text-sm inline-block  text-white uppercase font-semibold bg-indigo-600 hover:bg-indigo-600">Continue</Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </motion.section>
        </>
    )
}
