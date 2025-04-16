
import { admindb, db } from "@/db/db";

import { decodeId } from "@/libs/server/sqids";
import { InviteForm } from "./components";
import { getTOS } from "@/libs/server/MDXParse";


async function getSale(sid: string) {
    const decodedSid = decodeId(sid);

    try {
        const sale = await admindb.query.sales.findFirst({
            where: (sale, { eq }) => eq(sale.id, decodedSid)
        })
        console.log(sale)
        return sale;
    } catch (error) {
        console.error(error)
        return null;
    }
}

interface InvitePackagePageProps {
    params: Promise<{ sid: string }>
    searchParams: Promise<{ [key: string]: string | boolean }>
}

export default async function InvitePackagePage(props: InvitePackagePageProps) {
    const { sid } = await props.params;
    const searchParams = await props.searchParams;
    const sale = await getSale(sid);
    const tos = await getTOS("term-of-use")
    if (!sale) {
        return <div>Invalid request.</div>;
    }

    return (
        <div className="flex flex-col gap-4">

            <div className="w-full max-w-lg mx-auto shadow-xs border bg-white border-gray-200 rounded-sm p-1 space-y-4  ">

                <div className="space-y-6  p-4">

                    <InviteForm sale={sale} tos={tos} />


                </div>

            </div>
        </div>
    );
}

