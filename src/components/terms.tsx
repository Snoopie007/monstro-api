
import { useState } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/libs/utils";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { MonstroLegal } from "@/libs/server/MDXParse";



interface TermsAndConditionsProps {
    checked: boolean;
    setChecked: (checked: boolean) => void;
    tos: MonstroLegal | undefined;
}

export function TermsAndConditions({ checked, setChecked, tos }: TermsAndConditionsProps) {
    const [scrolled, setScrolled] = useState(false);


    function handleScroll(e: React.UIEvent<HTMLDivElement>) {
        const element = e.currentTarget.querySelector('[data-radix-scroll-area-viewport]');
        if (!element) return;
        const { scrollTop, scrollHeight, clientHeight } = element;
        const scrollPercentage = (scrollTop + clientHeight) / scrollHeight * 100;
        if (scrollPercentage >= 90) {
            setScrolled(true);
        }
    }
    return (
        <Dialog>
            <DialogTrigger asChild>
                <div className="items-center relative bg-gray-50 flex space-x-1 border group border-gray-200 px-2 py-2.5 rounded-sm cursor-pointer">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="group" data-checked={checked}>
                        <rect x="1" y="1" width="14" height="14" rx="2" strokeWidth="1.5" className="stroke-gray-600" />
                        <path d="M12 5L6.5 10.5L4 8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                            className={cn("stroke-gray-600 opacity-0 ",
                                " group-data-[checked=true]:opacity-100 "
                            )} />
                    </svg>
                    <p className="text-xs leading-none">
                        You have read and agree to our <span className="text-red-500">Terms of Service</span> and <span className="text-red-500">Privacy Policy</span>.
                    </p>
                </div>
            </DialogTrigger>
            <DialogContent className="max-w-[500px] space-y-4 py-4 border-gray-100 bg-white text-black">
                <DialogHeader className="hidden">
                    <DialogTitle></DialogTitle>
                    <DialogDescription></DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-2 space-y-1 ">
                    <p className="font-semibold  text-base px-4">Monstro <span className="text-red-500">Terms of Service</span></p>
                    <ScrollArea className="h-[500px] px-4 border-y border-gray-200" onScrollCapture={handleScroll}>
                        <div className='prose py-4   text-black prose-strong:text-black prose-headings:my-4 prose-h2:text-2xl prose-sm max-w-full prose-p:font-roboto prose-p:leading-6'>
                            {tos?.content}
                        </div>
                    </ScrollArea>

                </div>
                <DialogFooter className="px-4 py-0">
                    <DialogClose asChild>
                        <Button variant={"clear"} onClick={() => setChecked(false)} size={"xs"} >
                            Decline
                        </Button>
                    </DialogClose>
                    <DialogClose asChild>
                        <Button
                            disabled={!scrolled}
                            onClick={() => setChecked(true)}
                            variant={"continue"}
                            size={"xs"}
                        >
                            Accept
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
