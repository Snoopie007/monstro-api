
import React from 'react';
import { UpdatePassword } from './components';
export default async function SettingsPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <div className='text-xl font-semibold mb-1'>Account Settings</div>
                <p className='text-sm'>Manage your account settings below.</p>
            </div>
            <div className='flex flex-col gap-2'>
                <div className='flex flex-row gap-2 border items-center rounded-sm p-4 space-y-1 w-full'>
                    <div className="pace-y-1 w-full">
                        <div className="text-base font-medium">Update Password</div>
                        <p className="text-sm text-muted-foreground">
                            Update your password to access your account.
                        </p>
                    </div>
                    <UpdatePassword locationId={params.id} />
                </div>
            </div>
        </div>
    )
}
