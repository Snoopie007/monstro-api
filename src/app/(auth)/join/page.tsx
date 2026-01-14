import { Suspense } from "react";
import { RegisterForm } from "../components/";
import { QuizForm } from "../components/";
import { Loader2 } from "lucide-react";

export default async function JoinQuizPage() {
    return (
        <div className="w-full max-w-lg mx-auto h-full py-16">
            <Suspense fallback={(
                <div className="flex flex-col items-center justify-center h-full gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    <span className="text-gray-500">Loading...</span>
                </div>
            )}>
                <RegisterForm />
                <QuizForm />
            </Suspense>

        </div>
    );
}

