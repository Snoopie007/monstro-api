
import React from 'react';
import { UpdatePassword } from './components';
import { Card } from '@/components/ui';
import PassFees from './components/PassFees';
export default async function SettingsPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <div className='text-xl font-semibold mb-1'>Account Settings</div>
                <p className='text-sm'>Manage your account settings below.</p>
            </div>
            <div className='flex flex-col gap-4'>
                <Card className='p-4 flex flex-row justify-between items-center rounded-sm bg-foreground/5 border-foreground/10'>
                    <div className="pace-y-1 w-full">
                        <div className="text-base font-medium">Update Password</div>
                        <p className="text-sm text-muted-foreground">
                            Update your password to access your account.
                        </p>
                    </div>
                    <UpdatePassword locationId={params.id} />
                </Card>
                <PassFees />
            </div>
        </div>

    )
}
