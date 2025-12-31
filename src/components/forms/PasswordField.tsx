import { useMemo } from "react";
import { cn } from "@/libs/utils";
import { Input } from "@/components/forms";
type PasswordStrengthLevel = "weak" | "fair" | "good" | "strong";

interface PasswordFieldProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    placeholder?: string;
}

export function PasswordField({ value, onChange, className, placeholder }: PasswordFieldProps) {
    const { level } = useMemo(() => {
        let score = 0;
        const checks = {
            length: value.length >= 8,
            hasLowercase: /[a-z]/.test(value),
            hasUppercase: /[A-Z]/.test(value),
            hasNumber: /[0-9]/.test(value),
            hasSymbol: /[!@#$%^&*(),.?":{}|<>_\-=\[\]\\;'`~]/.test(value),
        };

        // Length scoring
        if (value.length >= 8) score += 1;
        if (value.length >= 12) score += 1;
        if (value.length >= 16) score += 1;

        // Character variety scoring
        if (checks.hasLowercase) score += 1;
        if (checks.hasUppercase) score += 1;
        if (checks.hasNumber) score += 1;
        if (checks.hasSymbol) score += 1;

        let level: PasswordStrengthLevel;

        if (score <= 2) {
            level = "weak";
        } else if (score <= 4) {
            level = "fair";
        } else if (score <= 6) {
            level = "good";
        } else {
            level = "strong";
        }

        return { level, score };
    }, [value]);

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
        <div className="space-y-1">
            <div className={cn(" overflow-hidden border border-foreground/5 rounded-lg", className)}>
                <Input
                    type="password"
                    className={'text-base bg-transparent border-none rounded-none'}
                    placeholder={placeholder || "Password"}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
                {value && (
                    <div className="w-full bg-gray-200 h-1">
                        <div
                            className={cn(
                                "h-1 transition-all duration-300",
                                strengthColors[level],
                                strengthWidths[level]
                            )}
                        />
                    </div>
                )}
            </div>
            {value && (
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Password strength:</span>
                    <span className={cn(
                        "font-medium ",
                        level === "weak" && "text-red-600",
                        level === "fair" && "text-orange-600",
                        level === "good" && "text-yellow-600",
                        level === "strong" && "text-green-600"
                    )}>
                        {level}
                    </span>
                </div>
            )}
        </div>
    );
}