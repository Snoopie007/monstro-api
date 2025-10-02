
import React from 'react'
import { ResetPasswordForm } from '../../../components/ResetPassword'

interface Props {
    params: Promise<{ token: string }>
}

export default async function ResetPasswordPage(props: Props) {
    const params = await props.params
    const token = params.token

    return (
        <div className=" w-full  ">
            <ResetPasswordForm token={token} />
        </div>
    )
}
