
import { RegisterForm } from "../components/";
import { QuizForm } from "../components/";

export default async function JoinQuizPage() {
    return (
        <div className="w-full max-w-lg mx-auto  h-full py-16">
            <RegisterForm />
            <QuizForm />
        </div>
    );
}
