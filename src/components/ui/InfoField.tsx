
interface InfoFieldProps {
    label: string
    children: React.ReactNode
    className?: string
}

export function InfoField({ label, children, className }: InfoFieldProps) {
    return (
        <div className={`space-y-1  col-span-1 ${className}`}>
            <div className="text-xs font-medium text-muted-foreground">{label}</div>
            <span className="text-sm font-medium">
                {children}
            </span>
        </div>
    )
}