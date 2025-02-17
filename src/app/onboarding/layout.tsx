import { ReactNode } from "react";
import { OnboardingProvider } from "./provider/OnboardingProvider";
import { OnboardingHeader } from "./components/OnboardingHeader";
import { ScrollArea, TooltipProvider } from "@/components/ui";
export default async function OnboardingLayout({ children, }: { children: ReactNode }) {
    const progress = {
        currentStep: 2,
        completedSteps: [1],
        selectedPlan: null,
        paymentPlan: null
    }
    return (
        <main className="h-full  overflow-hidden   ">
            <TooltipProvider>

                <OnboardingProvider progress={progress}>
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
