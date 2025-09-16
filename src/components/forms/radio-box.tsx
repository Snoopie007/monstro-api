import { cn } from "@/libs/utils";

import { CircleCheck } from "lucide-react";
import { forwardRef } from "react";

interface RadioBoxProps<T> extends React.HTMLAttributes<HTMLDivElement> {
    value: T;
    selected?: boolean;
    hasRadio?: boolean;
    onSelectChange: (value: T) => void;
}

const RadioBox = <T,>({ children, value, selected, onSelectChange, className, hasRadio = true, ...props }: RadioBoxProps<T>) => {
    return (
        <div
            className={cn("border-2 cursor-pointer group flex hover:border-indigo-600 flex-row  shadow-unique border-black rounded-sm text-black bg-white p-4 gap-2",
                {
                    "border-indigo-600 ": selected,

                }
                , className)}
            data-selected={selected}
            onClick={() => onSelectChange(value)}
            {...props}
        >
            {hasRadio && <span className='
                flex-initial border-2 h-4 w-4 group cursor-pointer shrink-0 box-border border-black rounded-full relative
                group-data-[selected=true]:border-indigo-600
                group-hover:border-indigo-600
                ' aria-hidden="true">
                <span className={cn(
                    `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                    h-2 w-2 rounded-full bg-black opacity-0 transition-opacity duration-200
                    group-data-[selected=true]:opacity-100 group-data-[selected=true]:bg-indigo-600
                    group-hover:opacity-100  group-hover:bg-indigo-600 
                    `,
                )}></span>
            </span>}
            <div className="space-y-2  flex-1  ">
                {children}
            </div>

        </div>
    );
};

RadioBox.displayName = "RadioBox";

const RadioBoxTitle = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn("flex-1 font-semibold text-[0.95rem] leading-none", className)} {...props}>{children}</div>
));

RadioBoxTitle.displayName = "RadioBoxTitle";

const RadioBoxItem = forwardRef<HTMLLIElement, React.HTMLAttributes<HTMLLIElement>>(({ children, className, ...props }, ref) => (
    <li ref={ref} className={cn("flex flex-row gap-1 items-center", className)} {...props}>
        <CircleCheck size={20} className="fill-indigo-600 stroke-white" />
        <span className="text-sm font-medium">{children}</span>
    </li>
));

RadioBoxItem.displayName = "RadioBoxItem";

const RadioBoxPrice = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn("font-black flex flex-row items-center relative text-3xl  gap-0.5 ", className)} {...props}>
        <span className="text-[0.9em]  ">$</span>
        <span className={cn("")}>{children}</span>
    </div >
));

RadioBoxPrice.displayName = "PriceDisplay";

const RadioBoxList = forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement>>(({ children, className, ...props }, ref) => (
    <div className="w-full">
        <ul ref={ref} className={cn("flex flex-col gap-2 ", className)} {...props}>
            {children}
        </ul>
    </div>
));

RadioBoxList.displayName = "RadioBoxList";

export { RadioBox, RadioBoxList, RadioBoxPrice, RadioBoxItem, RadioBoxTitle };
