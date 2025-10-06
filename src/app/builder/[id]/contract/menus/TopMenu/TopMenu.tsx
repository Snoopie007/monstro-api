
import EditorToolBar from "./partials/EitorToolbar";
import { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { cn, sleep, tryCatch } from "@/libs/utils";
import { Contract } from "@/types";
import { MouseEvent, useState } from "react";
import { toast } from "react-toastify";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { ThemeMenu } from "@/app/builder/components";

interface TopMenuProps {
    contract: Contract
    isSidebarOpen?: boolean
    toggleSidebar?: () => void
    editor: Editor;
    lid: string
}

const ButtonStyle = "text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-md"

export function TopMenu({ editor, contract, isSidebarOpen, toggleSidebar, lid }: TopMenuProps) {
    const [savingDraft, setSavingDraft] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(false)
    const router = useRouter();

    async function saveContract(isDraft: boolean) {
        const setLoadingState = isDraft ? setSavingDraft : setLoading;
        setLoadingState(true);

        if (!isDraft && contract.title === "") {
            toast.error('Contract title is required', { theme: 'dark' });
            setLoadingState(false);
            return;
        }



        try {
            const body = {
                isDraft,
                content: editor.getHTML(),
                title: contract.title,
                description: contract.description
            };

            const { result, error } = await tryCatch(
                fetch(`/api/protected/loc/${lid}/contracts/${contract.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(body)
                })
            );

            if(result?.status === 403) {
                toast.error("You are not authorized to edit this contract");
                setLoadingState(false);
                return;
            }

            if (error || !result || !result.ok) {
                toast.error('Something went wrong', { theme: 'dark' });
                setLoadingState(false);
                return;
            }
            await sleep(2000);
            toast.success('Contract saved successfully', { theme: 'dark' });
            setLoadingState(false);

            if (!isDraft) {
                router.push(`/dashboard/location/${lid}/contracts/`);
            }
        } catch (error) {
            console.log('Error:', error);
            setLoadingState(false);
        }
    }

    async function publish() {
        saveContract(false);
    }

    async function saveDraft(e: MouseEvent) {
        saveContract(true);
    }

    return (
        <div className="fixed top-2 left-1/2 -translate-x-1/2  z-10 shadow-xs border border-foreground/10 px-2 rounded-lg py-1 flex items-center  ">
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleSidebar}
                        className={cn(ButtonStyle, "size-6")}
                    >
                        {isSidebarOpen ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className={cn(ButtonStyle, "size-6")} asChild>
                        <Link
                            href={`/dashboard/location/${lid}/contracts`}

                        >
                            <ChevronLeft size={18} />
                        </Link>
                    </Button>
                </div>
                <EditorToolBar editor={editor} />
                <ThemeMenu />
                <div className="flex  items-center">

                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(ButtonStyle, "children:hidden", { "children:inline-block": savingDraft })}
                        onClick={saveDraft}
                    >
                        <Loader2 size={14} className="mr-2 animate-spin" />
                        Save
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(ButtonStyle, 'children:hidden ', { "children:inline-block": loading })}
                        onClick={publish}
                    >
                        <Loader2 size={14} className="mr-2 animate-spin" />
                        Publish
                    </Button>
                </div>
            </div>

        </div>
    )
}
