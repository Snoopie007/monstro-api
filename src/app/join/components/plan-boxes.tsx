import { cn } from "@/libs/utils";

import { formatAmountForDisplay } from "@/libs/utils";
import { CircleCheck } from "lucide-react";
import { forwardRef } from "react";

interface RadioBoxItemProps {
    benefit: string;
}

const RadioBoxItem = forwardRef<HTMLLIElement, RadioBoxItemProps>(({ benefit }, ref) => (
    <li ref={ref} className="flex flex-row gap-1 items-center">
        <CircleCheck size={20} className="fill-indigo-600 stroke-white" />
        <span className="text-sm font-medium">{benefit}</span>
    </li>
));

RadioBoxItem.displayName = "RadioBoxItem";

interface PriceDisplayProps {
    price: number;
}

const PriceDisplay = forwardRef<HTMLDivElement, PriceDisplayProps>(({ price }, ref) => (
    <div ref={ref} className="font-black text-4xl flex flex-row">
        <span className="text-xl">$</span>
        {formatAmountForDisplay(price, "usd", false)}
    </div>
));

PriceDisplay.displayName = "PriceDisplay";

interface RadioLabelProps {
    name: string;
}

const RadioLabel = forwardRef<HTMLDivElement, RadioLabelProps>(({ name }, ref) => (
    <div ref={ref} className="flex flex-row items-center gap-2">
        <span className="flex-initial border-2 h-4 w-4 group cursor-pointer flex-shrink-0 box-border border-black rounded-full relative" aria-hidden="true">
            <span className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-black opacity-0 transition-opacity duration-200 group-hover:opacity-100")}></span>
        </span>
        <div className="flex-1 font-bold text-base">{name}</div>
    </div>
));

RadioLabel.displayName = "RadioLabel";

interface RadioBoxProps {
    launcher: {
        id: number;
        name: string;
        price: number;
        benefits: string[];
    };
    isSelected: boolean;
    onSelect: (launcher: any) => void;
}

const RadioBox = forwardRef<HTMLDivElement, RadioBoxProps>(({ launcher, isSelected, onSelect }, ref) => (
    <div
        ref={ref}
        key={launcher.id}
        className={cn("border-2 cursor-pointer shadow-unique border-black rounded-sm text-black bg-white p-4 flex flex-col gap-2", isSelected && "border-indigo-600")}
        onClick={() => onSelect(launcher)}
    >
        <RadioLabel name={launcher.name} />
        <div className="space-y-2">
            <PriceDisplay price={launcher.price} />
            <div className="w-full">
                <ul className="flex flex-col gap-2">
                    {launcher.benefits.map((benefit, index) => (
                        <RadioBoxItem key={index} benefit={benefit} />
                    ))}
                </ul>
            </div>
        </div>
    </div>
));

RadioBox.displayName = "RadioBox";