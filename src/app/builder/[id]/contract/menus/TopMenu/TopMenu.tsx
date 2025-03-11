
import EditorToolBar from "./partials/EitorToolbar";
import { Editor } from "@tiptap/react";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn, sleep, tryCatch } from "@/libs/utils";
import { Contract } from "@/types";
import { MouseEvent, useState } from "react";
import { toast } from "react-toastify";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface TopMenuProps {
    contract: Contract
    isSidebarOpen?: boolean
    toggleSidebar?: () => void
    editor: Editor;
    locationId: string
}

const LeftMenuButtonStyle = "font-medium text-sm flex flex-row items-center cursor-pointer children:hidden border-foreground/20 h-full text-nowrap px-4 flex-1"

export function TopMenu({ editor, contract, isSidebarOpen, toggleSidebar, locationId }: TopMenuProps) {
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
                fetch(`/api/protected/loc/${locationId}/contracts/${contract.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(body)
                })
            );

            if (error || !result || !result.ok) {
                toast.error('Something went wrong', { theme: 'dark' });
                setLoadingState(false);
                return;
            }
            await sleep(2000);
            toast.success('Contract saved successfully', { theme: 'dark' });
            setLoadingState(false);

            if (!isDraft) {
                router.push(`/dashboard/${locationId}/contracts/`);
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
        <div className="flex-initial   flex items-center h-[50px] px-2 border-b  border-foreground/20 ">
            <div className="flex-initial  h-full flex items-center w-[130px]">
                <Button
                    className="bg-transparent  mr-3  rounded-sm focus-visible:ring-0 focus-visible:ring-offset-0  overflow-hidden text-foreground hover:bg-accent h-auto p-1.5"
                    onClick={toggleSidebar}
                >
                    <Icon name={(isSidebarOpen ? 'PanelLeftClose' : 'PanelLeftOpen')} size={18} />
                </Button>
                <Link
                    href={`/dashboard/${locationId}/contracts`}
                    className={cn(LeftMenuButtonStyle, "text-sm justify-center  h-full py-2 border-x")}
                >
                    Back
                </Link>
            </div>
            <div className="flex-1 w-full items-center justify-center flex flex-row py-2">

                <EditorToolBar editor={editor} />

            </div>
            <div className="flex-initial  h-full flex justify-end w-[250px] " >

                <div className="flex  items-center h-full ">

                    <button
                        className={cn(LeftMenuButtonStyle, " border-x", { "children:inline-block": savingDraft })}
                        onClick={saveDraft}
                    >
                        <Icon name="LoaderCircle" size={14} className="mr-2 animate-spin" />
                        Save
                    </button>
                    <button className={cn(LeftMenuButtonStyle, { "children:inline-block": loading })}
                        onClick={publish}
                    >
                        <Icon name="LoaderCircle" size={14} className="mr-2 animate-spin" />
                        Publish
                    </button>
                </div>
            </div>
        </div>
    )
}
