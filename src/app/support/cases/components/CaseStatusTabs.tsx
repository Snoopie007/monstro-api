import { cn } from "@/libs/utils";


const StatusTabs = ['All', 'Open', 'Escalated', 'Closed'];

interface StatusTabGroupProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export function StatusTabGroup({ activeTab, setActiveTab }: StatusTabGroupProps) {
    return (
        <div className="flex items-center gap-1 bg-background border border-foreground/10 rounded-sm p-1">
            {StatusTabs.map((status) => (
                <div
                    key={status}
                    onClick={() => setActiveTab(status)}
                    className={cn(
                        "relative px-3 py-1.5 text-xs rounded-sm font-medium transition-colors",
                        "hover:text-foreground/80 z-10 cursor-pointer",
                        activeTab === status ? "text-foreground" : "text-foreground/60"
                    )}
                >
                    {status}
                    <div
                        className={cn(
                            "absolute inset-0 bg-foreground/5 rounded-sm transition-all duration-200",
                            activeTab === status ? "opacity-100" : "opacity-0"
                        )}
                    />
                </div>
            ))}
        </div>
    )
}