
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
        <div className="flex text-black font-roboto h-screen flex-col items-center py-44">
            <div className="w-full max-w-sm ">
                <div className={"mb-6 text-center"}>
                    <h1 className="text-xl  font-bold text-center">
                        Welcome back!
                    </h1>

                </div>

                <CredentialForm />
                <p className="text-base text-center mt-5">
                    Don't have an account{" "}
                    <Link
                        href={"/auth/join"}
                        className={"inline-flex text-indigo-600 hover:text-black underline  text-base rounded-sm"}
                    >
                        Sign up
                    </Link>
                </p>
                {/* <div className="divider flex flex-row justify-center items-center my-8 text-white ">
                        Or sign up with
                    </div> */}


            </div>

        </div>
    );
}

