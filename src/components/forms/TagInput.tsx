'use client'
import { ScrollArea } from "@/components/ui/ScrollArea";
import { cn } from "@/libs/utils";
import { XIcon } from "lucide-react";
import { ChangeEvent, KeyboardEvent, useCallback, useRef, useState } from "react";
import { Skeleton } from "../ui";

interface TagInputProps {
    list: string[];
    value: string[];
    placeholder?: string;
    onChange: (tags: string[]) => void;
    className?: string;
    disabled?: boolean;
}

export function InputTags({ value, list, onChange, placeholder = "Type to add tags...", className, disabled }: TagInputProps) {
    const [input, setInput] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const filteredList = useCallback(() => {
        if (!input.trim()) return list;

        const filtered = list.filter(item =>
            item.toLowerCase().includes(input.toLowerCase().trim())
        );
        return filtered.length ? filtered : list;
    }, [input, list]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const handleEnter = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && input.trim()) {
            handleSelect(input.trim());
        }
    };

    const handleSelect = (item: string) => {
        if (list.includes(item) && !value.includes(item)) {
            onChange([...value, item]);
            setInput("");
        }
    };

    const handleRemove = (item: string) => {
        onChange(value.filter(tag => tag !== item));
    };

    return (
        <div className="relative">
            <div className={cn("px-2 bg-background rounded-sm border flex flex-row items-center", className)}>
                <div>
                    <ul className="flex gap-1 flex-row">
                        {value.map((item, i) => (
                            <li
                                key={i}
                                className="flex flex-row gap-1 items-center bg-indigo-500 text-white px-2 text-[0.8rem] font-medium py-1 rounded-sm"
                            >
                                <span>{item}</span>
                                {!disabled && <XIcon
                                    className="cursor-pointer hover:opacity-80"
                                    size={14}
                                    onClick={() => handleRemove(item)}
                                />}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="flex-initial w-full">
                    <input
                        type="text"
                        ref={inputRef}
                        value={input}
                        onChange={handleChange}
                        onKeyUp={handleEnter}
                        className="border-none placeholder:text-sm w-full bg-transparent py-2 px-1 focus:outline-none focus-visible:ring-0 focus:ring-0"
                        placeholder={placeholder}
                        disabled={disabled}
                    />
                </div>
            </div>

            {input.trim() && (
                <div className="absolute bg-background z-50 border w-[250px] border-foreground/5 rounded-md top-[45px] left-0">
                    <ScrollArea className="h-[150px] p-1">
                        <div className="space-y-0.5">
                            {filteredList().map((item, i) => (
                                <div
                                    key={i}
                                    onClick={() => handleSelect(item)}
                                    className={cn(
                                        "px-2 py-1.5 hover:bg-foreground/5 rounded-sm cursor-pointer text-sm font-medium"
                                    )}
                                >
                                    {item}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            )}
        </div>
    );
}
