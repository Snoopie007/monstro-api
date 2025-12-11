
import { useState } from "react";
import {
    Dialog, DialogTrigger, DialogContent,
    DialogTitle, DialogDescription, DialogFooter, DialogClose,
    Button,
} from "@/components/ui";
import { cn } from "@/libs/utils";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { VisuallyHidden } from "@react-aria/visually-hidden";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface TermsAndConditionsProps {
    checked: boolean;
    setChecked: (checked: boolean) => void;
    tos: string | null;
    className?: string;
}

export function TermsAndConditions({ checked, setChecked, tos, className }: TermsAndConditionsProps) {
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
                <div className={cn("items-center  flex space-x-1 border group border-foreground/10 p-3 rounded-lg cursor-pointer", className)}>
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="group" data-checked={checked}>
                        <rect x="1" y="1" width="14" height="14" rx="2" strokeWidth="1.5" className="stroke-gray-500" />
                        <path d="M12 5L6.5 10.5L4 8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                            className={cn("stroke-gray-600 opacity-0 ",
                                " group-data-[checked=true]:opacity-100 "
                            )} />
                    </svg>
                    <p className="text-sm leading-none">
                        You have read and agree to our <span className="text-red-500">Terms of Service</span> and <span className="text-red-500">Privacy Policy</span>.
                    </p>
                </div>
            </DialogTrigger>
            <DialogContent className="max-w-[600px] space-y-4 rounded-lg py-4 border-none bg-white text-black">
                <VisuallyHidden className="hidden">
                    <DialogTitle>Terms of Service</DialogTitle>
                    <DialogDescription></DialogDescription>
                </VisuallyHidden>
                <div className="flex flex-col  ">
                    <p className="font-semibold  text-lg px-4 pb-3">Monstro <span className="text-red-500">Terms of Service</span></p>
                    <div className="bg-red-500 text-white p-4 ">
                        You must scroll to the bottom of the page to accept the terms of service.
                    </div>
                    <ScrollArea className="h-[500px] px-4 border-y border-gray-200" onScrollCapture={handleScroll}>
                        <div className='prose py-4   text-black prose-strong:text-black prose-headings:my-4 prose-h2:text-2xl prose-sm max-w-full prose-p:font-roboto prose-p:leading-6'>

                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                            >
                                {tos}
                            </ReactMarkdown>
                        </div>
                    </ScrollArea>

                </div>
                <DialogFooter className="px-4 py-0">
                    <DialogClose asChild>
                        <Button variant={"clear"} onClick={() => setChecked(false)}  >
                            Decline
                        </Button>
                    </DialogClose>
                    <DialogClose asChild>
                        <Button
                            disabled={!scrolled}
                            onClick={() => setChecked(true)}
                            variant={"continue"}

                        >
                            Accept
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
