
import {
    TablePage,
    TablePageHeaderTitle,
    TablePageHeader,
    TablePageHeaderSection

} from "@/components/ui";
import { CreatePlan, SearchInput, SubscriptionList, PackageList } from "./components";
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


export default async function Products(props: { params: Promise<{ id: string, type: string }> }) {

    const params = await props.params;
    const programs = await getPrograms(params.id);

    return (
        <ProductsProvider programs={programs}>

            <TablePage>
                <TablePageHeader>
                    <TablePageHeaderTitle>{params.type === "subs" ? "Subscriptions" : "Packages"}</TablePageHeaderTitle>
                    <TablePageHeaderSection>
                        <SearchInput />
                        <CreatePlan lid={params.id} type={params.type === "subs" ? "recurring" : "one-time"} />

                    </TablePageHeaderSection>
                </TablePageHeader>
                {params.type === "subs" ? <SubscriptionList lid={params.id} /> : <PackageList lid={params.id} />}
            </TablePage>
        </ProductsProvider>

    );
}
