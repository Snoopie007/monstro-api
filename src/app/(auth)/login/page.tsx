
import Link from "next/link";
import LoginForm from "../components/Login/LoginForm";
import { LoginStatusProvider } from "./providers/LoginStatusProvider";

export default async function SignIn() {

    return (
        <div className="flex text-black  flex-col items-center py-[10%]">
            <LoginStatusProvider>
                <div className="w-full max-w-sm border  rounded-sm shadow-xs p-1">
                    <div className="p-6 space-y-6">

                        <LoginForm />
                    </div>
                    <div className="py-4 bg-gray-100 px-2 text-center rounded-sm">
                        <p className="text-sm  ">
                            Don't have an account{" "}
                            <Link href={"/join"} className={"inline-flex text-indigo-600 hover:text-black underline  text-sm"} >
                                Create account
                            </Link>
                        </p>
                    </div>
                </div>
            </LoginStatusProvider>

        </div>
    );
}

