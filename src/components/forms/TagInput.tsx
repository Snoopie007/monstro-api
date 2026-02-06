'use client'
import { ScrollArea } from "@/components/ui/ScrollArea";
import { cn } from "@/libs/utils";
import { XIcon } from "lucide-react";
import { ChangeEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (input.trim() && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: Math.max(rect.width, 250)
            });
        } else {
            setDropdownPosition(null);
        }
    }, [input]);

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
        <div ref={containerRef} className="relative">
            <div className={cn("px-2 py-2 bg-background rounded-sm border flex flex-row flex-wrap items-center gap-1", className)}>
                {value.map((item) => (
                    <span
                        key={item}
                        className="inline-flex flex-row items-center gap-1 bg-indigo-500 text-white px-2 text-[0.8rem] font-medium py-1 rounded-sm whitespace-nowrap flex-shrink-0"
                    >
                        {item}
                        {!disabled && (
                            <button
                                type="button"
                                onClick={() => handleRemove(item)}
                                className="hover:opacity-80 flex-shrink-0"
                                aria-label={`Remove ${item}`}
                            >
                                <XIcon size={14} />
                            </button>
                        )}
                    </span>
                ))}
                <input
                    type="text"
                    ref={inputRef}
                    value={input}
                    onChange={handleChange}
                    onKeyUp={handleEnter}
                    className="border-none placeholder:text-sm min-w-[120px] flex-1 bg-transparent py-1 px-1 focus:outline-none focus-visible:ring-0 focus:ring-0"
                    placeholder={value.length === 0 ? placeholder : ""}
                    disabled={disabled}
                />
            </div>

            {input.trim() && dropdownPosition && typeof document !== 'undefined' && createPortal(
                <div 
                    className="fixed bg-background z-[100] border border-foreground/5 rounded-md shadow-lg pointer-events-auto"
                    style={{ 
                        top: dropdownPosition.top, 
                        left: dropdownPosition.left,
                        width: dropdownPosition.width,
                        maxHeight: '200px'
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <ScrollArea className="h-[150px] p-1">
                        <div className="space-y-0.5">
                            {filteredList().map((item) => (
                                <button
                                    key={item}
                                    type="button"
                                    onClick={() => handleSelect(item)}
                                    className={cn(
                                        "w-full text-left px-2 py-1.5 hover:bg-foreground/5 rounded-sm cursor-pointer text-sm font-medium"
                                    )}
                                >
                                    {item}
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                </div>,
                document.body
            )}
        </div>
    );
}
