
import React from 'react'
import { ForgotPassword } from '../../components/ResetPassword/ForgotPassword'

export default async function ForgotPasswordPage(props: { searchParams: Promise<{ lid: string | null }> }) {
    const searchParams = await props.searchParams
    const lid = searchParams.lid
    return (
        <div className=" w-full shadow-xs border bg-white border-gray-200 rounded-sm p-1 space-y-4  ">
            <ForgotPassword />
        </div>
    )
}
