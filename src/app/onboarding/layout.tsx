import { ReactNode } from "react";
import { OnboardingProvider } from "./provider/OnboardingProvider";
import { OnboardingHeader } from "./components/OnboardingHeader";
import { ScrollArea, TooltipProvider } from "@/components/ui";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
export default async function OnboardingLayout({ children, }: { children: ReactNode }) {
    const session = await auth();

    if (session?.user.onboarding.completed) {
        return redirect(`/dashboard/${session?.user.locations[0].id}`)
    }

    const DefaultProgress = {
        currentStep: 1,
        completedSteps: [],
        plan: null,
        paymentPlan: null,
        agreedToTerms: false,
        pkg: null,
        completed: false
    }
    return (
        <main className="h-full  overflow-hidden  bg-white  text-black">
            <TooltipProvider>

                <OnboardingProvider progress={{ ...DefaultProgress, ...session?.user.onboarding }}>
                    <OnboardingHeader />

                    <ScrollArea className="h-[calc(100vh-55px)] ">
                        <div className="flex flex-col w-xl m-auto  text-foreground">
                            <div className="flex flex-col w-full py-10">
                                {children}
                            </div>
                        </div>
                    </ScrollArea>

                </OnboardingProvider>
            </TooltipProvider>
        </main >
    );
}
