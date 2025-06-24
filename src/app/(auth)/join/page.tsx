import Link from "next/link";
import { RegisterForm } from "../components/RegistrationForm";
import { Check, CheckCircle2 } from "lucide-react";

const MonstroBenefits = [
    {
        title: "Gamify Member Management for Growth",
        description: "We transform member engagement with gamification, helping martial arts schools boost revenue and generate more referrals effortlessly."
    },
    {
        title: "Improve Referrals with a Member App Built for Engagement",
        description: "Keep members active and connected while making it easy to share achievements and invite friends."
    },
    {
        title: "Convert More Leads with AI-Powered Engagement",
        description: "Automate follow-ups, nurture leads, and increase appointment show-up rates—only pay for results."
    },
    {
        title: "Join for Free—Only Pay for What You Use",
        description: "Increase conversion with built-in optimizations and access to 100+ payment options."
    },
]

export default async function JoinMonstroPage() {
    return (
        <div className="grid grid-cols-2 gap-10  ">
            <div className="col-span-1  space-y-6" >
                <div className="text-2xl text-gray-900 font-bold">
                    Turn your member management into a revenue stream!
                </div>
                <ul className="space-y-6 ">
                    {MonstroBenefits.map((benefit, index) => (
                        <li key={index} className=" flex items-start flex-row gap-2">
                            <div className="flex-shrink-0 flex-initial  size-4 bg-indigo-500 rounded-full flex items-center justify-center">
                                <Check className="flex-shrink-0 flex-initial  size-3 text-white" />
                            </div>
                            <div className="space-y-2 flex-1">
                                <div className="leading-none text-base font-medium">{benefit.title}</div>
                                <div className="text-gray-600 text-sm ">{benefit.description}</div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="shadow-xs min-w-[400px] border bg-white border-gray-200 rounded-sm p-1 space-y-4  ">
                <div className="space-y-4 p-6">
                    <h1 className="text-lg font-bold">
                        Create your Monstro account
                    </h1>
                    <div className=" ">
                        <RegisterForm />
                    </div>
                </div>
                <div className="flex flex-row justify-center gap-0.5 text-center  text-sm bg-gray-100 p-4 rounded-sm">
                    <span className="text-gray-700">Already have an account?</span>
                    <Link href={"/login"} className={"inline-flex  text-indigo-500  rounded-sm"}  >
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
}
