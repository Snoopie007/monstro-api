
import Link from "next/link";
import { auth } from "@/auth";
import LoginForm from "../components/LoginForm";

export default async function SignIn() {

    return (
        <div className="flex text-black font-roboto h-screen flex-col items-center py-[10%]">
            <div className="w-full max-w-sm border  rounded-sm shadow-xs p-1">
                <div className="p-6 space-y-6">
                    <h1 className="text-lg font-bold ">
                        Sign in to Monstro
                    </h1>
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

        </div>
    );
}

