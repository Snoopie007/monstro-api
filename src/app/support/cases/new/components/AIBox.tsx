import { Button } from "@/components/ui/button"

export function AIBox() {
    return (
        <div className="flex flex-col xl:flex-row py-8 px-10 relative border rounded-sm border-foreground/10 overflow-hidden">
            <div className="flex flex-col gap-3 z-[2] flex-shrink-0">
                <div>
                    <p className="text-sm font-medium">Coming Soon</p>
                    <p className="text-sm ">AI assistant to help you with your support issue.</p>
                </div>
                <div>
                    <Button variant="foreground" size="xs" className="rounded-sm">
                        <span className="truncate">Coming Soon</span>
                    </Button>
                </div>
            </div>
            <div className="absolute z-[1] scale-75 -right-24 top-0">
                <div className="relative grow flex flex-col gap-3 w-[400px]">
                    <div className="flex items-start gap-3 pl-12 bg-foreground/5 ">
                        <div className="size-8 rounded-full  flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-square text-foreground-lighter">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                        </div>
                        <div className="flex-1 bg-background/5 rounded-lg p-4 max-w-[280px]">
                            <p className="text-sm text-muted-foreground">Hi! I'm your AI assistant. How can I help you today?</p>
                        </div>
                    </div>
                    <div className="flex items-start justify-end gap-3 pr-10 bg-foreground/5 ">
                        <div className=" rounded-lg p-4 max-w-[280px]">
                            <p className="text-sm text-muted-foreground">I can help you with database queries, API endpoints, or any other technical questions you might have.</p>
                        </div>
                    </div>
                </div>
                <div className="absolute -inset-2 bg-gradient-to-l from-transparent to-background"></div>
            </div>
        </div>
    )
}