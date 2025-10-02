
import { admindb, db } from "@/db/db";

import { decodeId } from "@/libs/server/sqids";
import { InviteForm } from "./components";
import { getTOS } from "@/libs/server/MDXParse";


async function getSale(sid: string) {

    const decodedSid = decodeId(sid);
    try {
        const sale = await admindb.query.sales.findFirst({
            where: (sale, { eq }) => eq(sale.id, decodedSid)
        });

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

    const sale = await getSale(sid);
    const tos = await getTOS("term-of-use")

    if (!sale) {
        return <div className="h-screen flex items-center justify-center ">
            <div className="w-full max-w-lg mx-auto  border bg-white border-gray-200 rounded-lg p-6 ">
                <div className="text-center">
                    Uh oh, we can't find that the associated account with your invitation link to join Monstro.
                    Please contact your sales rep.
                </div>
            </div>
        </div>;
    }

    return (
        <div className="w-full max-w-lg mx-auto  h-screen ">

            <InviteForm sale={sale} tos={tos} />


        </div>
    );
}

