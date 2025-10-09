import { Select, SelectItem, SelectContent, SelectValue, SelectTrigger, Input } from "@/components/ui";
import { FilterInputType } from "./ColumnTypes";

export const FilterInput = ({ 
    columnId, 
    value, 
    onChange, 
    inputType, 
    options, 
    placeholder 
}: {
    columnId: string;
    value: string;
    onChange: (value: string) => void;
    inputType: FilterInputType;
    options?: Array<{ value: string; label: string }>;
    placeholder?: string;
}) => {
    switch (inputType) {
        case FilterInputType.SELECT:
            return (
                <Select 
                    value={value} 
                    onValueChange={onChange}
                >
                    <SelectTrigger className="h-7 text-sm">
                        <SelectValue placeholder={placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                        {options?.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            );
        
        case FilterInputType.MULTI_SELECT:
            // Implementation for multi-select (future enhancement)
            return (
                <Input 
                    className="h-7 text-sm" 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                />
            );
        
        case FilterInputType.DATE:
            return (
                <Input 
                    type="date"
                    className="h-7 text-sm" 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)}
                />
            );
        
        case FilterInputType.NUMBER:
            return (
                <Input 
                    type="number"
                    className="h-7 text-sm" 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                />
            );
        
        case FilterInputType.TEXT:
        default:
            return (
                <Input 
                    className="h-7 text-sm" 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                />
            );
    }
};