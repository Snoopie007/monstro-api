'use client'
import React, { Dispatch, SetStateAction, useState } from 'react'


import {
    Form, FormControl, FormField, FormMessage, FormItem, FormLabel, FormDescription,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    RegionSelect,
} from '@/components/forms';
import {
    Button, DialogDescription,
    DialogTitle, DialogHeader, Dialog,
    DialogContent, DialogBody,
    DialogTrigger, DialogFooter, DialogClose
} from '@/components/ui';
import { CountryCodes } from '@/libs/data';
import { Location } from '@/types';
import { Loader2 } from 'lucide-react';
import Stripe from 'stripe';

interface StripeTaxSettingsProps {
    lid: string;
    location: Location;
    settings: Stripe.Tax.Settings | null
    updateSettings: Dispatch<SetStateAction<Stripe.Tax.Settings | null>>
}


export function StripeTaxSettings({ lid }: StripeTaxSettingsProps) {
    const [loading, setLoading] = useState(false);
    const [amount, setAmount] = useState(0);
    const [open, setOpen] = useState(false);
    const [state, setState] = useState("");


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size={"sm"} variant={"foreground"} >
                    Enable
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-lg" aria-modal>
                <DialogHeader className="space-y-0">
                    <DialogTitle className='text-sm font-medium flex flex-row items-center gap-1'>
                        Register Tax Account
                    </DialogTitle>
                    <DialogDescription className='hidden'></DialogDescription>
                </DialogHeader>
                <DialogBody>
                    <fieldset>
                        <div className="grid grid-cols-9 gap-2">
                            <div className="col-span-3">
                                <RegionSelect value={state} onChange={(value: string | null) => setState(value || "")} />
                            </div>

                            <FormField
                                name="office.country"
                                render={({ field }) => (
                                    <FormItem className="col-span-3">


                                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select your country" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {CountryCodes.map((country) => (
                                                    <SelectItem key={country.code} value={country.code}>
                                                        {country.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </fieldset>

                </DialogBody>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button size='sm' variant={'outline'}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button size='sm' variant={'foreground'} onClick={() => { }}
                        disabled={loading || !amount}>
                        {loading ? <Loader2 className='size-4 animate-spin ' /> : "Save"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
