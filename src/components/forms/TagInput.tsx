'use client'
import { ScrollArea } from "@/components/ui";
import { XIcon } from "lucide-react";
import { ChangeEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";

interface TagInputProps {
    list: string[];
    value?: string[];
    onChange: (tags: string[]) => void;
}

export function InputTags({ value, list, onChange }: TagInputProps) {

    const [input, setInput] = useState<string>("");
    const [tags, setTags] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        setTags(value || [])
    }, [value])


    const filteredList = useCallback(() => {
        if (!input || input === '') return list;
        const filtered = list.filter(item => item.toLowerCase().includes(input?.toLowerCase()));
        console.log(filtered)
        if (filtered.length < 1) return list;
        return filtered;
    }, [input, list]);

    function handleChange(e: ChangeEvent<HTMLInputElement>) {
        setInput(e.target.value);
    }

    function handleEnter(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            addItem(input);
            onChange(tags);
        }
    }
    function handleSelect(item: string) {
        addItem(item);
        onChange(tags);
    }


    function addItem(item: string) {
        if (list.includes(item)) {
            setTags([...tags, item]);
            setInput("");
        }
    }

    function handleRemove(item: string) {
        setTags(tags.filter(tag => tag !== item));
        setInput("");
    }
    return (
        <div className="relative">

            <div className=' px-3 bg-background text-foreground rounded-sm border flex flex-row items-center'>
                <div className="">
                    <ul className="flex gap-1 flex-row ">
                        {tags.map((item, i) => (
                            <li key={i} className="flex flex-row gap-1 items-center bg-indigo-600 text-white px-2 text-sm font-medium py-1 rounded-sm">
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
                        className='border-none w-full bg-transparent py-2 px-1 focus:outline-none focus-visible:ring-0 focus:ring-0'
                    />

                </div>

            </div>
            {input && (
                <div className="absolute  bg-background  z-50 border border-foreground/10  w-[250px] rounded-sm top-[45px] left-0 text-background">
                    <ScrollArea className="h-[150px] ">
                        {filteredList().map((item, i) => (
                            <div key={i}
                                onClick={() => { handleSelect(item) }}
                                className="px-3 last-of-type:border-b-0 text-foreground hover:bg-indigo-500 hover:text-white cursor-pointer py-1.5 border-b border-foreground/5 text-sm font-medium"
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
