
import Link from "next/link";
import { LoginForm } from "../components";
import { LoginProvider } from "../providers";

export default async function SignIn() {

    return (
        <div className="w-full max-w-lg mx-auto flex flex-col items-center justify-center h-full px-4">
            <LoginProvider>
                <LoginForm />

            </LoginProvider>
        </div>
    );
}

