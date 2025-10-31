import { MonstroPlan } from "@/types/admin";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui";

const Benefits = [
    {
        name: "Achievement & Rewards",
        description: "Gamify the experience with achievements and rewards.",
    },
    {
        name: "AI Assistant Support",
        description: "Get AI-powered support for your members.",
    },
    {
        name: "AI Nurturing System",
        description: "AI lead nurturing system that helps you capture and convert more members automatically, even while you sleep.",
    },
    {
        name: "Attendance Tracking",
        description: "Track member attendance and participation.",
    },
    {
        name: "Automated Reminders",
        description: "Send automatic reminders to keep members engaged.",
    },
    {
        name: "Basic Support",
        description: "Email and live chat support only.",
    },
    {
        name: "Class Schedule Management",
        description: "Manage your members' class and schedule details.",
    },
    {
        name: "Community & Groups",
        description: "Build a community with groups and allow your members to connect with each other.",
    },
    {
        name: "Done For You Website",
        description: "We will design and launch a proven 5-page high-converting website to turn visitors into trial members.",
    },
    {
        name: "Leaderboards",
        description: "Motivate members with real-time rankings that showcase top performers.",
    },
    {
        name: "Member Reports",
        description: "Get a detailed report of your members' activity and progress.",
    },
    {
        name: "Membership Management",
        description: "Manage your members' Membership and billing details.",
    },
    {
        name: "Mobile App",
        description: "Keep your members engaged and coming back with a mobile app.",
    },
    {
        name: "Monstro Marketing Suites",
        description: "Access the full Monstro Marketing Suite with powerful tools to boost member enrollments and grow your business.",
    },
    {
        name: "Customer-Funded Processing",
        description: "Pass on credit card fees to your customers via transaction fees.",
    },
    {
        name: "Payment Management",
        description: "Manage your members' payments and billing details.",
    },
    {
        name: "Push Notifications",
        description: "Send instant updates, reminders, and announcements directly to members' devices.",
    },
    {
        name: "Staff Management",
        description: "Manage your staff, coaches, and instructors. Their schedules, availability, and more.",
    },
    {
        name: "Workflows",
        description: "Build advanced workflows and automation to streamline your business processes.",
    },
];

export function CompareTable({ plans }: { plans: MonstroPlan[] }) {
    return (
        <div >
            <div className=" font-semibold mb-2">Compare Features </div>
            <div className="border border-foreground/10 rounded-lg overflow-hidden">
                <Table className="min-w-full bg-background">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[240px] h-10"></TableHead>
                            {["Free", " Start-up", "Growth"].map((plan) => (
                                <TableHead key={plan} className="h-10 text-center ">{plan}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Benefits.map((benefit, i) => (
                            <TableRow key={i} className="border-b border-foreground/10">
                                <TableCell className=" w-[240px] align-middle font-semibold">
                                    <Tooltip>
                                        <TooltipTrigger className="flex items-center gap-1 " >
                                            {benefit.name}
                                            <InfoIcon className="size-4 -mt-0.5 " />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-[150px] text-sm">{benefit.description}</TooltipContent>
                                    </Tooltip>
                                </TableCell>
                                {plans.map((plan) => (
                                    <TableCell key={plan.id} >
                                        <div className="flex items-center justify-center">
                                            {plan.benefits && plan.benefits.includes(benefit.name) ? <CheckIcon /> : undefined}
                                        </div>
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}



// A classic check icon
function CheckIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" className="size-4 text-green-500">
            <circle cx="12" cy="12" r="10" className="fill-green-500 stroke-0" />
            <polyline points="8 12.5 11 15.5 16 10.5" stroke="white" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export function InfoIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} >
            <circle cx="12" cy="12" r="10" className="fill-indigo-500 stroke-0" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" className="text-white" />
            <path d="M12 17h.01" className="text-white" />
        </svg>
    )
}
