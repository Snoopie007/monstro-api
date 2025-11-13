

import { CreatePlan, SubscriptionList, PackageList } from "./components";
import { db } from "@/db/db";
import { ProductsProvider } from "./providers";
import { Program } from "@/types";


async function getPrograms(lid: string): Promise<Program[]> {

    try {

        const programs = await db.query.programs.findMany({
            where: (program, { eq }) => eq(program.locationId, lid)
        })
        return programs;
    } catch (error) {
        console.error(error);
        return [];
    }
}


export default async function Products(props: { params: Promise<{ id: string, type: 'subs' | 'pkgs' }> }) {

    const params = await props.params;
    const programs = await getPrograms(params.id);

    return (
        <ProductsProvider programs={programs}>

            <div className="flex flex-col gap-4">
                <div className="max-w-4xl mx-auto w-full space-y-4">
                    <div className="flex flex-row items-center gap-2 justify-between">
                        <div className="text-xl font-bold">
                            {params.type === "subs" ? "Subscriptions" : "Packages"}
                        </div>
                        <CreatePlan lid={params.id} type={params.type} />
                    </div>

                    <div className="space-y-2">
                        {params.type === "subs" ? (
                            <SubscriptionList lid={params.id} />
                        ) : (
                            <PackageList lid={params.id} />
                        )}
                    </div>
                </div>

            </div>

        </ProductsProvider >
    )
}
