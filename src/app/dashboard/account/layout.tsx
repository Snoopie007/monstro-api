import { ScrollArea } from "@/components/ui";
import { AccountNav } from "./components";
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
    return (
        <ScrollArea className='h-[calc(100vh-50px)] '>
            <div className="max-w-5xl m-auto  pb-20">
                <div className="mb-6  border-b border-foreground/10 py-4">
                    <h4 className='text-lg font-bold'>Account Settings</h4>
                </div>
                <div className='grid grid-cols-8 gap-6'>
                    <AccountNav />
                    <div className="col-span-6">
                        {children}
                    </div>
                </div>
            </div>
        </ScrollArea>
    )
}