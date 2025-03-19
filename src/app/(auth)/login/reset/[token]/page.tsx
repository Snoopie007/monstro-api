
import React from 'react'
import { ResetPasswordForm } from '../../../components/ResetPassword'

interface Props {
    params: Promise<{ token: string }>
}

export default async function ResetPasswordPage(props: Props) {
    const params = await props.params
    const token = params.token

    return (
        <div className=" w-full shadow-xs border  bg-white border-gray-200 rounded-sm p-1 space-y-4  ">
            <ResetPasswordForm token={token} />
        </div>
    )
}
