
import authConfig from "@/auth.config";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import CredentialForm from "./credential-form";

export default async function SignIn() {
    const session = await auth();
    const providers = authConfig.providers;

    if (session) {
        redirect("/dashboard");
    }

    return (
        <div className="flex text-black font-roboto h-screen flex-col items-center py-[10%]">
            <div className="w-full max-w-sm border  rounded-sm shadow-xs p-1">
                <div className="p-4">
                    <div className={"mb-6 text-center"}>
                        <h1 className="text-lg font-bold text-center">
                            Welcome back!
                        </h1>

                    </div>

                    <CredentialForm />

                </div>
                <div className="py-4 bg-gray-100 px-2 text-center  rounded-sm">
                    <p className="text-sm  ">
                        Don't have an account{" "}
                        <Link href={"/auth/join"} className={"inline-flex text-indigo-600 hover:text-black underline  text-sm"} >
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>

        </div>
    );
}

