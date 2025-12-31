
import { redirect } from "next/navigation";
import { ResetPassword } from "./components";
import { auth } from "@/libs/auth/server";


export default async function ResetPasswordPage() {
    const session = await auth();
    if (!session) {
        return redirect("/login");
    }
    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <h2 className="text-xl font-bold">Reset Password</h2>
                <p className="text-sm text-muted-foreground">
                    Enter your new password and confirm it to reset your account.
                </p>

            </div>
            <ResetPassword userId={session.user.id} />
        </div>
    )
}
