
interface CircleProgressProps {
    radius?: number
    strokeWidth?: number
    progress: number

}
export function CircleProgress({ radius, strokeWidth, progress }: CircleProgressProps) {
    const circumference = 2 * Math.PI * (radius || 6)
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (

        <svg className="transform rotate-[-90deg] w-full h-full" viewBox="0 0 16 16">

            <circle cx="8" cy="8" r="6" strokeWidth={strokeWidth || 2} className="stroke-foreground/10" fill="none" stroke="currentColor" />

            <circle cx="8" cy="8" r="6" strokeWidth={strokeWidth || 2} className="text-green-500" fill="none" stroke="currentColor"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
            />
        </svg>

    )
}
