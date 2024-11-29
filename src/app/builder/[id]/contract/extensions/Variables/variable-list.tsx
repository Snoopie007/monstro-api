import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'

import {
    Variable,
    SuggestionProps,
    SuggestionOptions,
} from "./types";

import { cn } from '@/libs/utils';

export type VariableListRef = {
    // For convenience using this SuggestionList from within the
    // mentionSuggestionOptions, we'll match the signature of SuggestionOptions's
    // `onKeyDown` returned in its `render` function
    onKeyDown: NonNullable<
        ReturnType<
            NonNullable<SuggestionOptions<Variable>["render"]>
        >["onKeyDown"]
    >;
};
export type VariableListProps = SuggestionProps<Variable>;
export const VariableList = forwardRef<VariableListRef, VariableListProps>((props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)
    const scrollContainer = useRef<HTMLDivElement>(null)
    const activeItem = useRef<HTMLButtonElement>(null)
    // Anytime the groups change, i.e. the user types to narrow it down, we want to
    // reset the current selection to the first menu item
    useEffect(() => {
        setSelectedIndex(0)
    }, [props.items])
    // Scroll selected item into view whenever selectedIndex changes

    const selectItem = useCallback((index: number) => {

        if (index >= props.items.length) return;

        const variable = props.items[index]

        if (variable) {
            props.command(variable)
        }
    }, [props])

    const upHandler = () => {

        setSelectedIndex(
            (selectedIndex + props.items.length - 1) % props.items.length
        );
    };

    const downHandler = () => {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
    };

    const enterHandler = () => {
        selectItem(selectedIndex);
    };

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }) => {
            if (event.key === "ArrowUp") {
                console.log("Key Up")
                upHandler();
                return true;
            }

            if (event.key === "ArrowDown") {
                downHandler();
                return true;
            }

            if (event.key === "Enter") {
                enterHandler();
                return true;
            }

            return false;
        },
    }));

    useEffect(() => {
        if (activeItem.current && scrollContainer.current) {
            const offsetTop = activeItem.current.offsetTop
            const offsetHeight = activeItem.current.offsetHeight

            scrollContainer.current.scrollTop = offsetTop - offsetHeight
        }
    }, [selectedIndex])

    const commandClickHandler = useCallback((index: number) => {
        return () => {
            selectItem(index)
        }
    }, [selectItem])

    if (!props.items.length) {
        return null
    }

    return (

        <div className="rounded-sm border-foreground/20 border md:min-w-[180px]">
            <div ref={scrollContainer} className=' h-[240px] overflow-y-auto'>
                <div className='p-1.5 flex flex-col justify-start'>
                    {props.items.length ? props.items.map((variable, i) => (

                        <button
                            key={variable.id}
                            ref={selectedIndex === i ? activeItem : null}
                            className={cn('text-left text-sm px-2 flex-1 py-1 rounded-sm hover:bg-accent', { 'bg-accent': selectedIndex === i })}
                            onClick={commandClickHandler(i)}
                        >
                            {variable.label}
                        </button>


                    )) : (
                        <div className="px-2 py-1  text-base">
                            No result found.
                        </div>
                    )}
                </div>
            </div>
        </div>


    )
})


export default VariableList