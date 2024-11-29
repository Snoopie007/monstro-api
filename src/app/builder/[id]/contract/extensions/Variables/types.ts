import { SuggestionOptions } from "@tiptap/suggestion";

export type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";

export type Variable = {
    id: number;
    label: string;
    value: string;
};

export type VariableGroup = {
    name: string;
    variables: Variable[];
}

export type { Instance as TippyInstance } from "tippy.js";


