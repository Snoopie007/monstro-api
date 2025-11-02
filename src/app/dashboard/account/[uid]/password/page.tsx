
import { ResetPassword } from "./components";


export default async function ResetPasswordPage({ params }: { params: Promise<{ uid: string }> }) {
    const { uid } = await params;
    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <h2 className="text-xl font-bold">Reset Password</h2>
                <p className="text-sm text-muted-foreground">
                    Enter your new password and confirm it to reset your account.
                </p>

            </div>
            <ResetPassword userId={uid} />
        </div>
    )
}
