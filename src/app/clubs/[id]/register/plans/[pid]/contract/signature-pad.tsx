'use client'
import { FormEvent, useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { useRouter } from "next/navigation";
import { toast } from 'react-toastify';
import { fillContract } from '@/libs/api';
import { Button } from '@/components/ui/button';


export default function SignaturePad({ locationId, planId, contract, content }: { locationId: string, planId: string, contract: any, content: string }) {
    const signatureRef = useRef<any>(null);
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        content: content,
        signed: false,
        contractId: contract.id,
        stripePlanId: planId
    });


    async function onsignContract() {
        setLoading(true);
        console.log(formData)

        try {
            const contract = await fillContract(formData)
            console.log(contract.data);
            console.log(contract.data.pdfUrl);
            if (contract.data && contract.data.pdfUrl) {
                // Trigger the download
                // link.style.display = "none";
                const link = document.createElement('a');
                link.href = contract.data.pdfUrl; // URL from the backend
                link.download = 'contract.pdf'; // Suggested filename for the downloaded PDF
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                router.push(`/clubs/${locationId}/register/plan/${planId}/checkout`)
            }
        } catch (error: any) {
            toast.error(error);
            setLoading(false);
        }

    }

    return (
        <div className='grid grid-cols-3 gap-6 items-end'>
            <div className='col-span-2 '>
                <div className='font-semibold mb-2'>Signature Here:</div>
                <div className="justify-center border-dashed  border-2 border-gray-400  rounded-sm items-center ">

                    <SignatureCanvas backgroundColor="rgb(255 255 255)"
                        penColor='green'
                        ref={signatureRef}
                        onEnd={() => setFormData({ ...formData, signed: true, content: `${content}<div style="width: 100%; height: 100px;"><img src="${signatureRef.current.toDataURL('image/jpeg')}"/></div>` })}
                        canvasProps={{ width: 400, height: 100, className: 'bg-white ' }} />

                </div>
            </div>

            <div className="col-span-1 flex flex-col ">
                <p className='leading-5 mb-2'>
                    By signing this agreement, you agree to the terms and conditions of the agreement.

                </p>
                <Button onClick={() => onsignContract()} disabled={loading} className="bg-amber-400 font-bold hover:text-white hover:bg-black rounded-[4px] py-2">Submit & Sign</Button>
            </div>

        </div>
    )
}
