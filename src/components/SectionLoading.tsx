import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/libs/utils';


interface SectionLoaderProps {
    length?: number;
}

export default function SectionLoader({ length = 3 }: SectionLoaderProps) {

    return (
        <div className="flex flex-col gap-2">
            {Array.from({ length }).map((_, i) => (
                <Skeleton key={i} className={cn("   bg-foreground/20 h-6 rounded-sm")} />
            ))}
        </div>
    )
}
