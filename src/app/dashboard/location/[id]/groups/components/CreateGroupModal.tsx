import { Button, Dialog, DialogContent, DialogTitle, DialogHeader, DialogTrigger } from "@/components/ui";
import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    Input,
    Textarea,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/forms";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { tryCatch } from "@/libs/utils";

const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    handle: z.string().min(1, "Handle is required").regex(/^[a-zA-Z0-9-_]+$/, "Handle must only contain letters, numbers, hyphens, or underscores"),
    description: z.string().optional(),
    type: z.enum(["public", "private"]),
    coverImage: z.any().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateGroupModalProps {
    trigger?: React.ReactNode;
}

export function CreateGroupModal({ trigger }: CreateGroupModalProps) {
    const [open, setOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const params = useParams();
    const router = useRouter();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            handle: "",
            description: "",
            type: "public",
        },
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            form.setValue("coverImage", file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const removeImage = () => {
        form.setValue("coverImage", null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleCreateGroup = async (values: FormValues) => {
        setIsLoading(true);
        const formData = new FormData();
        formData.append("name", values.name);
        formData.append("handle", values.handle);
        if (values.description) formData.append("description", values.description);
        formData.append("type", values.type);
        if (values.coverImage) formData.append("coverImage", values.coverImage);

        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${params.id}/groups`, {
                method: "POST",
                body: formData,
            })
        );

        if (error || !result?.ok) {
            const data = await result?.json().catch(() => null);
            toast.error(data?.error || "Failed to create group");
            setIsLoading(false);
            return;
        }

        toast.success("Group created successfully");
        setOpen(false);
        form.reset();
        setPreviewUrl(null);
        setIsLoading(false);
        router.refresh();
    }

    return (
        <Dialog open={open} onOpenChange={setOpen} >
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="primary" className="rounded-full mt-4">
                        Create One Now!
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] p-4">
            <DialogTitle className="mb-2">Create Group</DialogTitle>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleCreateGroup)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="coverImage"
                            render={({ field: { value, onChange, ...field } }) => (
                                <FormItem>
                                    <FormLabel>Cover Image</FormLabel>
                                    <FormControl>
                                        <div className="flex flex-col gap-4">
                                            {previewUrl ? (
                                                <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-foreground/10 bg-muted">
                                                    <img
                                                        src={previewUrl}
                                                        alt="Cover preview"
                                                        className="h-full w-full object-cover"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        className="absolute right-2 top-2 h-6 w-6 rounded-full"
                                                        onClick={removeImage}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div
                                                    className="flex aspect-video cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-foreground/25 bg-muted/50 hover:bg-muted"
                                                    onClick={() => fileInputRef.current?.click()}
                                                >
                                                    <div className="rounded-full bg-background p-2 shadow-sm">
                                                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                                    </div>
                                                    <div className="text-center text-sm text-muted-foreground">
                                                        <span className="font-medium text-foreground">
                                                            Click to upload
                                                        </span>{" "}
                                                        or drag and drop
                                                    </div>
                                                    <p className="text-xs text-muted-foreground/75">
                                                        SVG, PNG, JPG or GIF (max. 800x400px)
                                                    </p>
                                                </div>
                                            )}
                                            <Input
                                                {...field}
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleFileChange}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Group Name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="handle"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Handle</FormLabel>
                                    <FormControl>
                                        <Input placeholder="group-handle" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Describe your group..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="public">Public</SelectItem>
                                            <SelectItem value="private">Private</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Group
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
