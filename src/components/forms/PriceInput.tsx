'use client'
import { Input } from "./input";
import { useState, useEffect } from "react";

import {
    ButtonGroup,
    ButtonGroupText,
} from "../ui";
import { Label } from "./label";


interface PriceInputProps {
    value: number | undefined
    onChange: (value: number) => void
}
export function PriceInput({ value, onChange }: PriceInputProps) {
    const [inputValue, setInputValue] = useState("0.00");

    useEffect(() => {
        if (value) {
            setInputValue((value / 100).toFixed(2));
        }
    }, [])

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {

        const val = e.target.value;
        if (val === "") {
            setInputValue("0.00");
            return;
        }

        let cursorPos = e.target.selectionStart || 0;
        const decimalIndex = e.target.value.indexOf('.');

        // Split into whole number and decimal parts
        const parts = val.split('.');
        let wholeNum = parts[0] || "0";
        let decimal = parts[1] || "00";

        // Limit decimal to 2 digits
        decimal = decimal.slice(0, 2).padEnd(2, '0');

        // Handle number input before decimal point
        if (cursorPos <= decimalIndex || decimalIndex === -1) {

            if (inputValue.startsWith("0")) {
                if (parts[0].startsWith("0")) {
                    wholeNum = parts[0].slice(1) || "0";
                    cursorPos = 1;
                } else {
                    wholeNum = parts[0].slice(0, 1) || "0";
                }
            } else {
                wholeNum = parts[0] || "0";
            }
        }

        const newValue = `${wholeNum}.${decimal}`;
        setInputValue(newValue);

        setTimeout(() => {
            e.target.setSelectionRange(cursorPos, cursorPos);
        }, 0);
    }

    function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
        const val = e.target.value;
        const decimalIndex = val.indexOf('.');

        if (decimalIndex !== -1) {
            e.target.setSelectionRange(0, decimalIndex);

        }

    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Backspace') {
            const cursorPos = e.currentTarget.selectionStart;
            if (cursorPos && inputValue[cursorPos - 1] === '.') {
                e.preventDefault();
                e.currentTarget.setSelectionRange(cursorPos, cursorPos - 1);
            }
        }
    }

    return (
        < ButtonGroup className="w-full">
            <ButtonGroupText asChild>
                <Label className="bg-foreground/5 border-foreground/5" >$</Label>
            </ButtonGroupText>
            <Input
                type="text"
                className="pl-3"
                placeholder="0.00"
                value={inputValue}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                    const numericValue = parseFloat(inputValue) * 100;

                    onChange(Math.round(numericValue));
                }}
                onChange={handleChange}
                onFocus={handleFocus}
            />

        </ButtonGroup>
    )
}
