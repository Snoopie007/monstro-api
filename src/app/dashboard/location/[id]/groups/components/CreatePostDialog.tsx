"use client";

import { Button, Dialog, DialogContent, DialogTrigger } from "@/components/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { X, ImageIcon, Loader2, Youtube, Link2, Plus } from "lucide-react";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
    Input,
    Textarea,
} from "@/components/forms";
import { useSession } from "@/hooks/useSession";
import { toast } from "react-toastify";
import { tryCatch } from "@/libs/utils";

const formSchema = z.object({
    title: z.string().min(1, "Title is required"),
    content: z.string().min(1, "Content is required"),
    videoEmbed: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreatePostDialogProps {
    groupId: string;
    groupName: string;
    onSuccess?: () => void;
    trigger?: React.ReactNode;
}

function extractVideoId(url: string): { platform: 'youtube' | 'vimeo' | null; id: string | null } {
    // YouTube patterns
    const youtubePatterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ];
    
    for (const pattern of youtubePatterns) {
        const match = url.match(pattern);
        if (match) {
            return { platform: 'youtube', id: match[1] };
        }
    }
    
    // Vimeo patterns
    const vimeoPattern = /(?:vimeo\.com\/)(\d+)/;
    const vimeoMatch = url.match(vimeoPattern);
    if (vimeoMatch) {
        return { platform: 'vimeo', id: vimeoMatch[1] };
    }
    
    return { platform: null, id: null };
}

export function CreatePostDialog({ groupId, groupName, onSuccess, trigger }: CreatePostDialogProps) {
    const { data: session } = useSession();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [showVideoInput, setShowVideoInput] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            content: "",
            videoEmbed: "",
        },
    });

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setFiles((prev) => [...prev, ...newFiles]);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const removeFile = (index: number) => {
        setFiles((prev) => {
            const newFiles = [...prev];
            newFiles.splice(index, 1);
            return newFiles;
        });
    };

    const handleCreatePost = async (values: FormValues) => {
        setIsLoading(true);
        const formData = new FormData();
        formData.append("groupId", groupId);
        formData.append("title", values.title);
        formData.append("content", values.content);
        
        if (values.videoEmbed) {
            const videoInfo = extractVideoId(values.videoEmbed);
            if (videoInfo.platform && videoInfo.id) {
                formData.append("videoEmbed", JSON.stringify({
                    url: values.videoEmbed,
                    platform: videoInfo.platform,
                    videoId: videoInfo.id,
                }));
            }
        }
        
        files.forEach((file) => {
            formData.append("files", file);
        });

        const { result, error } = await tryCatch(
            fetch(`/api/protected/groups/post`, {
                method: "POST",
                body: formData,
            })
        );

        if (error || !result?.ok) {
            const data = await result?.json().catch(() => null);
            toast.error(data?.error || "Failed to create post");
            setIsLoading(false);
            return;
        }

        toast.success("Post created successfully");
        setOpen(false);
        form.reset();
        setFiles([]);
        setShowVideoInput(false);
        setIsLoading(false);
        onSuccess?.();
    };

    const videoEmbed = form.watch("videoEmbed");
    const videoInfo = videoEmbed ? extractVideoId(videoEmbed) : null;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="primary" size="sm" className="gap-2 rounded-full">
                        Create post
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden">
                {/* Header with author info */}
                <div className="flex items-center gap-3 p-4 border-b border-foreground/10">
                    <Avatar className="h-10 w-10">
                        {session?.user?.image ? (
                            <AvatarImage src={session.user.image} alt={session.user.name || ""} />
                        ) : (
                            <AvatarFallback>{session?.user?.name?.[0] || "U"}</AvatarFallback>
                        )}
                    </Avatar>
                    <div className="flex-1">
                        <p className="text-sm font-medium">{session?.user?.name}</p>
                        <p className="text-xs text-muted-foreground">
                            posting in <span className="font-medium text-foreground">{groupName}</span>
                        </p>
                    </div>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleCreatePost)} className="flex flex-col">
                        {/* Content area */}
                        <div className="p-4 space-y-4">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input 
                                                placeholder="Title" 
                                                className="border-0 p-0 text-xl font-semibold focus-visible:ring-0 placeholder:text-muted-foreground/50"
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="content"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Textarea 
                                                placeholder="Write something..." 
                                                className="border-0 p-0 min-h-[120px] resize-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Video embed input */}
                            {showVideoInput && (
                                <FormField
                                    control={form.control}
                                    name="videoEmbed"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input 
                                                        placeholder="Paste YouTube or Vimeo URL..." 
                                                        className="pr-8"
                                                        {...field} 
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            form.setValue("videoEmbed", "");
                                                            setShowVideoInput(false);
                                                        }}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {/* Video preview */}
                            {videoInfo?.platform && videoInfo?.id && (
                                <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-foreground/10 bg-muted">
                                    {videoInfo.platform === 'youtube' && (
                                        <iframe
                                            src={`https://www.youtube.com/embed/${videoInfo.id}`}
                                            className="absolute inset-0 w-full h-full"
                                            allowFullScreen
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        />
                                    )}
                                    {videoInfo.platform === 'vimeo' && (
                                        <iframe
                                            src={`https://player.vimeo.com/video/${videoInfo.id}`}
                                            className="absolute inset-0 w-full h-full"
                                            allowFullScreen
                                            allow="autoplay; fullscreen; picture-in-picture"
                                        />
                                    )}
                                </div>
                            )}

                            {/* Image previews */}
                            {files.length > 0 && (
                                <div className="grid grid-cols-2 gap-3">
                                    {files.map((file, index) => (
                                        <div key={`${file.name}-${index}`} className="relative group">
                                            <div className="aspect-video overflow-hidden rounded-lg border border-foreground/10 bg-muted">
                                                {file.type.startsWith('image/') ? (
                                                    <img 
                                                        src={URL.createObjectURL(file)} 
                                                        alt={file.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full">
                                                        <span className="text-sm text-muted-foreground">{file.name}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeFile(index)}
                                                className="absolute top-2 right-2 bg-destructive text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {/* Add more images button */}
                                    <div
                                        className="aspect-video flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-foreground/20 bg-muted/50 hover:bg-muted transition-colors"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Plus className="h-8 w-8 text-muted-foreground" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Toolbar */}
                        <div className="flex items-center justify-between p-4 border-t border-foreground/10 bg-muted/30">
                            <div className="flex items-center gap-1">
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    className="hidden"
                                    multiple
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full text-muted-foreground hover:text-foreground"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <ImageIcon className="h-5 w-5" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full text-muted-foreground hover:text-foreground"
                                    onClick={() => setShowVideoInput(true)}
                                >
                                    <Youtube className="h-5 w-5" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full text-muted-foreground hover:text-foreground"
                                    disabled
                                >
                                    <Link2 className="h-5 w-5" />
                                </Button>
                            </div>
                            <Button 
                                type="submit" 
                                disabled={isLoading}
                                className="rounded-full"
                            >
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Publish
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

