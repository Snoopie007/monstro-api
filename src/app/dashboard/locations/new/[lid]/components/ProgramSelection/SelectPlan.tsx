import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    Button
} from "@/components/ui"
import PlanList from "./PlanList"
import { Loader2 } from "lucide-react";
import { cn, sleep } from "@/libs/utils";
import PackageList from "./PackageList";
import { SetStateAction, Dispatch, useState } from "react";

import { useOnboarding } from "../../provider/OnboardingProvider";

interface SelectPlanProps {
    setCurrentStep: Dispatch<SetStateAction<number>>;

}

export function SelectPlan({ setCurrentStep }: SelectPlanProps) {
    const { locationState, updateLocationState } = useOnboarding()
    const [loading, setLoading] = useState(false);

    async function next() {
        setLoading(true);
        await sleep(1000);
        setLoading(false);
        setCurrentStep(2);
    }

    function clear() {
        updateLocationState({
            ...locationState,
            planId: null,
            pkgId: null,
            paymentPlanId: null
        })
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
                    disabled={!locationState.planId && !locationState.paymentPlanId}
                >
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    Continue
                </Button>
            </div>
        </div>
    )
}
