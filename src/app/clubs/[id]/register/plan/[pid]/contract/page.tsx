
import { ScrollArea } from "@/components/ui/scroll-area";
import { RegistrationHeader } from "../../../components/header";
import SignaturePad from "./signature-pad";
import { auth } from "@/auth";
import { Session } from "next-auth";


async function getContract(pid: string, session: Session | null) {
    if (!session) {
        return null;
    }
    const headers = {
        "Authorization": `Bearer ${session.user.token}`
    }

    try {
        // Is there a way to pull all contract and variable in 1 request?

        const contractRef = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/member/get-plan-contract/${pid}`, { headers });
        if (!contractRef.ok) {
            throw new Error("An error occurred while fetching the data.");
        }
        const { data: contract } = await contractRef.json();
        const variableRef = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/member/contract/${contract.id}/variables`, { headers });
        if (!variableRef.ok) {
            throw new Error("An error occurred while fetching the data.");
        }
        const { data: variables } = await variableRef.json();
        return { contract, variables }

    } catch (error) {
        return error;
    }
}


export default async function UserContractPage(props: { params: Promise<{ id: string, pid: string }> }) {
    const params = await props.params;

    const {
        id,
        pid
    } = params;

    const session = await auth();
    const contract: any = await getContract(pid, session);
    console.log(contract)
    function interpolateHtml(html: string, variables: any) {
        return html.replace(/<span class="variable" [^>]*data-label="([^"]+)"[^>]*data-value="([^"]+)"[^>]*>([^<]+)<\/span>/g, (match, label, valuePath) => {
            const pathParts = valuePath.split('.');
            let currentValue = variables;

            for (const part of pathParts) {
                if (currentValue && part in currentValue) {
                    currentValue = currentValue[part];
                } else {
                    currentValue = null;
                    break;
                }
            }

            return currentValue !== null ? currentValue : "____________________________";
        });
    }
    return (
        <div className="flex h-screen flex-col items-center justify-start">
            <RegistrationHeader backLink={"/clubs/register"} >
                Sign the Agreement
            </RegistrationHeader>
            <div className=" text-black w-full h-full bg-gray-200/50 p-2 pb-10 ">
                <div className='max-w-[765px] h-full  max-h-[900px] relative m-auto border-gray-100 rounded-sm border mt-2 p-3 bg-white'>
                    <ScrollArea className='h-[84%]  p-6 rounded-sm'>
                        <div id="contractContent" dangerouslySetInnerHTML={{ '__html': interpolateHtml(contract.contract.content, contract.variables) }}></div>
                    </ScrollArea>
                    <div className='absolute bottom-0 rounded-b-sm  left-0 border-t bg-white flex flex-row border-gray-200 py-4 px-6 w-full'>
                        <SignaturePad locationId={id} contract={contract.contract} planId={pid} content={interpolateHtml(contract.contract.content, contract.variables)} />
                    </div>
                </div>
            </div>
        </div>
    );
}