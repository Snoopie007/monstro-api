
import React from 'react';
import { PassOnFees, ProcessingMethods } from './components';

export default async function PaymentProcessingSettingsPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <div className='text-xl font-semibold mb-1'>Payment Processing Settings</div>
                <p className='text-sm'>Manage your payment processing settings below.</p>
            </div>
            <div className='flex flex-col gap-2'>

                <PassOnFees lid={params.id} />
                <ProcessingMethods lid={params.id} />
            </div>
        </div>

    )
}
