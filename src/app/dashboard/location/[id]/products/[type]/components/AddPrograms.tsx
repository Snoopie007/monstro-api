'use client'

import { cn } from "@/libs/utils"
import { useProducts } from "../providers/ProductContext"

export default function AddPrograms({ value, onChange }: { value: number[], onChange: (value: number[]) => void }) {
    const { programs } = useProducts()

    function isSelected(programId: number) {
        return value.includes(programId)
    }

    function handleChange(programId: number) {
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
                    const programId = Number(program.id) // Convert string to number
                    return (
                        <div
                            key={programId}
                            className={cn(
                                "py-1 px-2 text-xs rounded-sm bg-background border cursor-pointer",
                                "hover:bg-indigo-500 hover:text-white transition-colors",
                                isSelected(programId) && "bg-indigo-500 text-white"
                            )}
                            onClick={() => handleChange(programId)}
                        >
                            {program.name}
                    </div>
                )})}
            </div>
        </fieldset>
    )
}
