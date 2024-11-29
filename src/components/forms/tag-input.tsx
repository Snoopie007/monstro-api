'use client'
import { ScrollArea } from "@/components/ui/scroll-area";
import { XIcon } from "lucide-react";
import { ChangeEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";

interface TagInputProps {
    data: string[];
    value?: string[];
    onChange: (tags: string[]) => void;
}

export function TagInput({ value, data, onChange }: TagInputProps) {
    const [input, setInput] = useState<string>("");
    const [tags, setTags] = useState<string[]>(value || []);
    const inputRef = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        onChange(tags);
    }, [tags]);

    const filteredList = useCallback(() => {
        if (!input || input === '') return data;
        const filtered = data.filter(item => item.toLowerCase().includes(input?.toLowerCase()));
        if (filtered.length < 1) return data;
        return filtered;
    }, [input, data]);

    function handleChange(e: ChangeEvent<HTMLInputElement>) {
        setInput(e.target.value);
    }

    function handleEnter(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            addItem(input);
        }
    }
    function handleSelect(item: string) {

        addItem(item);
    }


    function addItem(item: string) {
        if (!tags.includes(item)) {
            setTags([...tags, item]);
            setInput("");
        }
    }

    function handleRemove(item: string) {
        setTags(tags.filter(tag => tag !== item));
        setInput("");
    }
    return (
        <div
            className="relative"
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
        >

            <div className=' px-3 rounded-md border flex flex-row items-center'>
                <div className="">
                    <ul className="flex gap-1 flex-row ">
                        {tags.map((item, i) => (
                            <li key={i} className="flex flex-row gap-1 bg-foreground items-center  text-background px-2 text-xs font-medium py-1 rounded-sm">
                                <span>{item}</span>
                                <XIcon className="cursor-pointer" size={14} onClick={() => handleRemove(item)} />
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="flex-initial w-full">
                    <input
                        type='text'
                        ref={inputRef}
                        onKeyUp={handleEnter}
                        value={input}
                        onChange={handleChange}
                        className='border-none bg-transparent w-full py-2 px-1 focus:outline-none focus-visible:ring-0 focus:ring-0'
                    />

                </div>

            </div>
            {(open) && (
                <div className="absolute  bg-background text-foreground border  border-foreground  w-full rounded-sm top-[110%] left-0 ">
                    <ScrollArea className="h-[200px] py-3">
                        {filteredList().map((item, i) => (
                            <div key={i}
                                onClick={() => { handleSelect(item); setOpen(false) }}
                                className="px-4 last-of-type:border-b-0 hover:bg-foreground hover:text-background cursor-pointer py-1.5 border-b border-foreground text-sm font-medium"
                            >
                                {item}
                            </div>
                        ))}
                    </ScrollArea>
                </div>
            )}
        </div>
    )
}
