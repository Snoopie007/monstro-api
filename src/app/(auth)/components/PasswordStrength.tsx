import { useMemo } from "react";
import { cn } from "@/libs/utils";

type PasswordStrengthLevel = "weak" | "fair" | "good" | "strong";

export default function PasswordStrength({ password }: { password: string }) {
    const { level, feedback } = useMemo(() => {
        let score = 0;
        const checks = {
            length: password.length >= 8,
            hasLowercase: /[a-z]/.test(password),
            hasUppercase: /[A-Z]/.test(password),
            hasNumber: /[0-9]/.test(password),
            hasSymbol: /[!@#$%^&*(),.?":{}|<>_\-=\[\]\\;'`~]/.test(password),
        };

        // Length scoring
        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;
        if (password.length >= 16) score += 1;

        // Character variety scoring
        if (checks.hasLowercase) score += 1;
        if (checks.hasUppercase) score += 1;
        if (checks.hasNumber) score += 1;
        if (checks.hasSymbol) score += 1;

        let level: PasswordStrengthLevel;
        let feedback: string;

        if (score <= 2) {
            level = "weak";
            feedback = "Weak password";
        } else if (score <= 4) {
            level = "fair";
            feedback = "Fair password";
        } else if (score <= 6) {
            level = "good";
            feedback = "Good password";
        } else {
            level = "strong";
            feedback = "Strong password";
        }

        return { level, score, feedback };
    }, [password]);




    const strengthColors = {
        weak: "bg-red-500",
        fair: "bg-orange-500",
        good: "bg-yellow-500",
        strong: "bg-green-500",
    };

    const strengthWidths = {
        weak: "w-1/4",
        fair: "w-1/2",
        good: "w-3/4",
        strong: "w-full",
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Password strength:</span>
                <span className={cn(
                    "font-medium",
                    level === "weak" && "text-red-600",
                    level === "fair" && "text-orange-600",
                    level === "good" && "text-yellow-600",
                    level === "strong" && "text-green-600"
                )}>
                    {feedback}
                </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                    className={cn(
                        "h-2 rounded-full transition-all duration-300",
                        strengthColors[level],
                        strengthWidths[level]
                    )}
                />
            </div>
        </div>
    );
}