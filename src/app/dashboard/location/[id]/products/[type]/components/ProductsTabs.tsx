"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { SubscriptionList } from "./SubList";
import { PackageList } from "./PackageList";
import { CreatePlan } from "./Create";

interface ProductsTabsProps {
    lid: string;
    type: 'subs' | 'pkgs';
}

export function ProductsTabs({ lid, type }: ProductsTabsProps) {
    return (
        <Tabs defaultValue="active" className="w-full">
            <div className="flex flex-row items-center gap-2 justify-between mb-4">
                <TabsList className="rounded-none p-0 bg-transparent border-none gap-2">
                    <TabsTrigger value="active" className="bg-foreground/5">
                        Active
                    </TabsTrigger>
                    <TabsTrigger value="archived" className="bg-foreground/5">
                        Archived
                    </TabsTrigger>
                </TabsList>
                <CreatePlan lid={lid} type={type} />
            </div>
            
            <TabsContent value="active" className="mt-0">
                {type === "subs" ? (
                    <SubscriptionList lid={lid} archived={false} />
                ) : (
                    <PackageList lid={lid} archived={false} />
                )}
            </TabsContent>
            
            <TabsContent value="archived" className="mt-0">
                {type === "subs" ? (
                    <SubscriptionList lid={lid} archived={true} />
                ) : (
                    <PackageList lid={lid} archived={true} />
                )}
            </TabsContent>
        </Tabs>
    );
}
