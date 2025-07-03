'use client'

import { cn } from "@/libs/utils"
import { useProducts } from "../providers"

export default function AddPrograms({ value, onChange }: { value: string[], onChange: (value: string[]) => void }) {
    const { programs } = useProducts()

    function isSelected(programId: string) {
        return value.includes(programId)
    }

    function handleChange(programId: string) {
        if (isSelected(programId)) {
            onChange(value.filter((id) => id !== programId))
        } else {
            onChange([...value, programId])
        }
    }
    return (
        <fieldset>

            <div className="flex flex-wrap gap-1">
                {programs.map((program) => {
                    return (
                        <div key={program.id}
                            className={cn(
                                "p-2 text-xs rounded-md bg-background border border-foreground/10 cursor-pointer",
                                "hover:bg-indigo-500 hover:text-white transition-colors",
                                isSelected(program.id) && "bg-indigo-500 text-white"
                            )}
                            onClick={() => handleChange(program.id)}
                        >
                            {program.name}
                        </div>
                    )
                })}
            </div>
        </fieldset>
    )
}
