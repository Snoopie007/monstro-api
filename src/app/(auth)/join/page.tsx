import Link from "next/link";
import { RegisterForm } from "../components/";


export default async function JoinMonstroPage() {
    return (
        <div className="shadow-xs min-w-[400px] border bg-white border-gray-200 rounded-sm p-1 space-y-4  ">
            <div className="space-y-4 p-6">
                <h1 className="text-lg font-bold">
                    Create your Monstro account
                </h1>
                <div className=" ">
                    <RegisterForm />
                </div>
            </div>
            <div className="flex flex-row justify-center gap-0.5 text-center  text-sm bg-gray-100 p-4 rounded-sm">
                <span className="text-gray-700">Already have an account?</span>
                <Link href={"/login"} className={"inline-flex  text-indigo-500  rounded-sm"}  >
                    Sign in
                </Link>
            </div>
        </div>
    );
}
