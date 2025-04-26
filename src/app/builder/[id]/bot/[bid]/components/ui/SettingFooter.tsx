import React from 'react'
import { SheetClose, SheetFooter } from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { cn } from '@/libs/utils';
import { FieldValues, UseFormReturn } from 'react-hook-form';
import { Loader2 } from 'lucide-react';


interface NodeSettingFooterProps<T extends FieldValues> {
    form: UseFormReturn<T>;
    loading: boolean;
    handleUpdate: (data: T) => void;
}

export default function NodeSettingFooter<T extends FieldValues>({
    form,
    loading,
    handleUpdate,
}: NodeSettingFooterProps<T>) {

    return (
        <SheetFooter className="text-right bg-background border-t py-3 px-4 absolute bottom-0 w-full" >
            <SheetClose asChild >
                <Button variant="outline" size="sm" > Cancel </Button>
            </SheetClose>
            < Button
                disabled={loading || !form.formState.isValid}
                variant={"foreground"}
                size={"sm"}
                onClick={form.handleSubmit(handleUpdate)}
                className={
                    cn(" rounded-sm   children:hidden ", {
                        "children:inline-block": loading
                    })}
                type="submit" >
                <Loader2 className="mr-2 size-4 animate-spin" />
                Save
            </Button>

        </SheetFooter>
    )
}
