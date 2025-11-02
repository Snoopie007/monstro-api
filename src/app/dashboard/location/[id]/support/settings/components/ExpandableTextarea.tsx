'use client'
import {
    Button, DialogTrigger, Dialog, ScrollArea, DialogContent,
    DialogTitle, DialogHeader, DialogDescription,
    DialogFooter,
    DialogClose
} from "@/components/ui";
import { EditorContent, useEditor } from "@tiptap/react";
import { Maximize2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { ExtensionKit } from "@/components/extensions";
import { cn } from "@/libs/utils";
import Placeholder from "@tiptap/extension-placeholder";

interface ExpandTextareaProps {
    type: string
    initialContent: string
    onUpdate: (content: string) => void
    disabled?: boolean
}

export function ExpandTextarea({ type, initialContent, onUpdate, disabled }: ExpandTextareaProps) {
    const [open, setOpen] = useState(false)
    const [, setContent] = useState(initialContent)

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            ...ExtensionKit(),
            Placeholder.configure({
                placeholder: 'Write something...',
            })
        ],
        onUpdate: ({ editor }) => {
            setContent(editor.getHTML())
        },

    });

    useEffect(() => {
        if (editor) {
            editor.commands.setContent(initialContent)
            editor.commands.focus('start')
        }
    }, [initialContent, editor])


    function handleClose(open: boolean) {
        if (!open) {
            onUpdate(editor?.getHTML() || "")
        }
        setOpen(open)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogTrigger asChild>
                <Button disabled={disabled} variant={'ghost'} size={'icon'} className="rounded-md size-5 text-muted-foreground hover:bg-foreground/10">
                    <Maximize2 className="size-3" />
                </Button>
            </DialogTrigger>
            <DialogContent className={cn(
                `w-[700px]   sm:rounded-lg
                bg-gradient-to-t dark:from-gray-950/20 dark:to-gray-950/50
                from-gray-100/50 to-gray-100
                border-[0.5px] border-foreground/5 backdrop-blur-xl
                
                `
            )}>
                <DialogHeader className="hidden">
                    <DialogTitle></DialogTitle>
                    <DialogDescription> </DialogDescription>
                </DialogHeader>
                <div className="flex items-center justify-between px-4 py-2">
                    <p className="text-[0.8rem]  font-medium">
                        {type}
                    </p>
                    <div>
                        <Button disabled={disabled} variant={'ghost'} size={'sm'} className="rounded-md h-6 gap-1">
                            <Sparkles className="size-3" />
                            Generate
                        </Button>

                    </div>
                </div>
                <ScrollArea className="overflow-hidden bg-transparent  h-[200px] px-1 ">
                    <EditorContent editor={editor} className="truncate" />
                </ScrollArea>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button disabled={disabled} variant={'foreground'} size={'sm'} className="rounded-sm">
                            Update
                        </Button>
                    </DialogClose>

                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


