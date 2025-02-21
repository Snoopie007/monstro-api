import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    Button
} from "@/components/ui"
import PlanList from "./PlanList"
import { useOnboarding } from "../../provider/OnboardingProvider"
import { Loader2 } from "lucide-react";
import { cn, sleep } from "@/libs/utils";
import PackageList from "./PackageList";
import { useState } from "react";
import { useSession } from "next-auth/react";

export function SelectPlan() {
    const { progress, updateProgress } = useOnboarding();
    const [loading, setLoading] = useState(false);

    async function next() {
        setLoading(true);
        await sleep(1000);
        updateProgress({
            ...progress,
            completedSteps: [...new Set([...progress.completedSteps, progress.currentStep])],
            currentStep: progress.currentStep + 1
        });
        setLoading(false);
    }

    function clear() {
        updateProgress({
            ...progress,
            plan: null,
            pkg: null,
            paymentPlan: null
        });
    }
    return (
        <div className="flex flex-col gap-4">
            <Tabs defaultValue="plans" >
                <TabsList className="grid w-full grid-cols-2 rounded-xs bg-gray-200" >
                    <TabsTrigger value="plans" className="rounded-xs text-sm cursor-pointer data-[state=active]:bg-indigo-500 data-[state=active]:text-white">Plans</TabsTrigger>
                    <TabsTrigger value="packages" className="rounded-xs text-sm cursor-pointer data-[state=active]:bg-indigo-500 data-[state=active]:text-white">Packages</TabsTrigger>
                </TabsList>
                <TabsContent value="plans" >
                    <PlanList />
                </TabsContent>
                <TabsContent value="packages">
                    <PackageList />
                </TabsContent>
            </Tabs>
            <div className="flex flex-row gap-2 justify-end">
                <Button variant={"clear"} size={"sm"} onClick={clear}>Clear</Button>
                <Button
                    variant={"continue"} size={"sm"} className={cn("children:hidden", {
                        "children:inline-block": loading,
                    })}
                    onClick={next}
                    disabled={!progress.plan && !progress.paymentPlan}
                >
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    Continue
                </Button>
            </div>
        </div>
    )
}
