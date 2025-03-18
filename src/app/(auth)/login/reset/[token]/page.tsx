
import React from 'react'
import { ResetPasswordForm } from '../../../components/ResetPassword'

interface Props {
    params: Promise<{ token: string }>
    searchParams: Promise<{ lid: string | null }>
}

export default async function ResetPasswordPage(props: Props) {
    const params = await props.params
    const searchParams = await props.searchParams
    const lid = searchParams.lid
    const token = params.token

    return (
        <div className=" w-full shadow-xs border  bg-white border-gray-200 rounded-sm p-1 space-y-4  ">
            <ResetPasswordForm token={token} lid={lid} />

        </div>
    )
}
