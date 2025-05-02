import { Member, FamilyPlan, MemberRelationship } from '@/types';
import {
    Button,
    Dialog,
    DialogContent,
    DialogTrigger,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
    DialogBody,
    DialogDescription,
    Avatar,
    AvatarImage,
    AvatarFallback
} from "@/components/ui";
import {
    Select, SelectTrigger, SelectValue,
    SelectContent, SelectItem,
    Form, FormControl, FormField,
    FormItem, FormLabel, Input, FormMessage,
} from '@/components/forms';
import { cn, tryCatch } from '@/libs/utils';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { AddFamilyMemberSchema } from '../../schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SetStateAction, Dispatch, useState, useEffect } from 'react';
import NewMemberFields from './NewMemberFields';
import { toast } from 'react-toastify';

interface AddChildMemberProps {
    parent: Member;
    lid: string;
}

const ExistingNewOptions = [
    {
        name: "Existing Member",
        description: "Select this if a family member already exists at this location.",
    },
    {
        name: "New Member",
        description: "Select this if a family member does not exist at this location.",
    },
]

const RelationshipOptions: MemberRelationship[] = [
    "parent",
    "spouse",
    "child",
    "sibling",
    "other",
]

export default function AddChildMember({ parent, lid }: AddChildMemberProps) {
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [existing, setExisting] = useState<string | null>(null);
    const [familyMember, setFamilyMember] = useState<Member | null>(null);
    const [searchEmail, setSearchEmail] = useState<string | null>(null);
    const [familyPlans, setFamilyPlans] = useState<FamilyPlan[]>([]);

    useEffect(() => {
        fetchFamilyPlans();
    }, []);

    const form = useForm<z.infer<typeof AddFamilyMemberSchema>>({
        resolver: zodResolver(AddFamilyMemberSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            relationship: "",
            familyPlanId: "",
            familyMemberId: parent.id
        },
        mode: "onChange",
    });



    async function fetchFamilyPlans() {
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/members/${parent.id}/family`)
        )
        if (error || !result || !result.ok) return
        const data = await result.json();
        setFamilyPlans(data);
    }

    async function findExistingMember() {
        if (!searchEmail) return;
        setLoading(true);
        setSearchEmail(null);
        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${lid}/search?email=${searchEmail}`)
        )
        setLoading(false);
        if (error || !result || !result.ok) {
            toast.error("Failed to find member");
            return;
        }

        const data = await result.json();

        if (data.id == parent.id) {
            toast.error("You cannot add yourself as a family member");
            return;
        }
        setFamilyMember(data);

        form.reset({
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            familyMemberId: parent.id
        });
        setLoading(false);
    }

    async function onSubmit(v: z.infer<typeof AddFamilyMemberSchema>) {
        setLoading(true);

        try {
            const payload = {
                firstName: v.firstName,
                lastName: v.lastName,
                email: v.email,
                phone: v.phone,
                familyMemberId: parent.id,
                relationship: v.relationship,
                familyPlanId: v.familyPlanId
            };

            const response = await fetch(`/api/protected/loc/${lid}/members/${parent.id}/family`, {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to add child member');
            }

            const data = await response.json();
            console.log('Family member added successfully:', data);

            setOpen(false);
        } catch (error) {
            console.error('Error adding child member:', error);
        } finally {
            setLoading(false);
        }
    }

    function reset() {
        setExisting(null);
        setFamilyMember(null);
        setSearchEmail(null);
        form.reset();
    }


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-y-0 border-r-0 rounded-none">+ Family to Plan</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] rounded-sm">
                <DialogHeader className="space-y-0 gap-0">
                    <DialogTitle>
                        Add Family to Plan
                    </DialogTitle>
                    <DialogDescription className="hidden"></DialogDescription>
                </DialogHeader>
                <DialogBody>
                    {!familyPlans || familyPlans.length === 0 && (
                        <div className='block py-4  text-center'>
                            <p className='text-sm text-muted-foreground'>No family plans found. <br />
                                Please sign up for a family plan first.</p>
                        </div>
                    )}
                    {familyPlans && familyPlans.length > 0 && (
                        <div className='flex flex-col gap-4'>

                            <ExistingMemberComponent familyMember={familyMember} existing={existing} setExisting={setExisting} reset={reset} searchEmail={searchEmail} setSearchEmail={setSearchEmail} />
                            <Form {...form}>
                                <form className={cn(
                                    "space-y-1  bg-foreground/10 px-3 py-2 rounded-sm hidden",
                                    { "block": (familyMember || existing === "New Member") }
                                )}>
                                    <input type='hidden' value={parent.id} name='familyMemberId' />

                                    <fieldset>
                                        <FormField
                                            control={form.control}
                                            name="familyPlanId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel size="tiny">Select a Family Plan</FormLabel>
                                                    <Select onValueChange={(value) => field.onChange(value)}>
                                                        <FormControl>
                                                            <SelectTrigger className="rounded-xs">
                                                                <SelectValue placeholder="Select a family plan" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>

                                                            {familyPlans.map((plan: any, index: number) => (
                                                                <SelectItem key={`${index}-${plan.planId}`} value={plan.planId}>{plan.planName}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </fieldset>
                                    <fieldset>
                                        <FormField
                                            control={form.control}
                                            name="relationship"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel size="tiny">Select a relationship</FormLabel>
                                                    <Select onValueChange={(value) => field.onChange(value)}>
                                                        <FormControl>
                                                            <SelectTrigger className="rounded-xs">
                                                                <SelectValue placeholder="Select a relationship" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {RelationshipOptions.map((relation: MemberRelationship) => (
                                                                <SelectItem key={relation} value={relation}>{relation}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </fieldset>
                                    {existing === "New Member" && (
                                        <NewMemberFields form={form} parent={parent} />
                                    )}
                                    <fieldset>

                                    </fieldset>
                                </form>
                            </Form>

                        </div>
                    )}
                </DialogBody>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline" size={"xs"}>Cancel</Button>
                    </DialogClose>
                    {(existing === "Existing Member" && !familyMember) && (
                        <Button
                            className={cn("children:hidden", { "children:inline-flex": loading })}
                            variant={"foreground"}
                            size={"xs"}
                            type="submit"
                            disabled={loading || !searchEmail}
                            onClick={() => findExistingMember()}
                        >
                            <Loader2 className="mr-2 size-4 hidden animate-spin" />
                            Search
                        </Button>
                    )}
                    {(existing === "New Member" || form.getValues("email")) && (
                        <Button
                            className={cn("children:hidden", { "children:inline-flex": loading })}
                            variant={"foreground"}
                            size={"xs"}
                            type="submit"
                            disabled={loading}
                            onClick={form.handleSubmit(onSubmit)}
                        // onClick={() => console.log(form.formState.errors)}
                        >
                            <Loader2 className="mr-2 size-4 hidden animate-spin" />
                            Add Family
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}

interface ExistingMemberComponentProps {
    familyMember: Member | null;
    searchEmail: string | null;
    existing: string | null;
    setExisting: Dispatch<SetStateAction<string | null>>;
    setSearchEmail: Dispatch<SetStateAction<string | null>>;
    reset: () => void;
}

function ExistingMemberComponent({ familyMember, existing, setExisting, reset, searchEmail, setSearchEmail }: ExistingMemberComponentProps) {
    return (
        <div className='space-y-1'>
            <div className='flex flex-col gap-2'>
                {existing && (
                    <div className=" text-xs ">
                        Adding <span className=" capitalize">{existing} </span>
                        <span className="text-indigo-500 cursor-pointer" onClick={() =>
                            reset()
                        }>(Change)</span>
                    </div>
                )}
                {!existing && ExistingNewOptions.map((option, index) => (
                    <div key={index} className={cn(
                        "border group rounded-sm p-4 bg-background hover:bg-indigo-500 hover:text-white cursor-pointer",
                    )}
                        onClick={() => setExisting(option.name)}
                    >
                        <div className='text-sm font-medium'>{option.name}</div>
                        <p className='text-xs group-hover:text-white text-muted-foreground'>{option.description}</p>
                    </div>
                ))}

            </div>
            {existing === "Existing Member" && (
                <div className='space-y-2'>

                    <Input type="email" placeholder="Search by email" value={searchEmail || ""} onChange={(e) => setSearchEmail(e.target.value)} />
                    {familyMember && (
                        <div className="flex flex-row bg-indigo-500 text-white gap-4 items-center border border-indigo-500 rounded-sm px-4 py-3">
                            <div>
                                <Avatar className="w-[35px] h-[35px] rounded-full mx-auto">
                                    <AvatarImage src={familyMember?.avatar || ""} />
                                    <AvatarFallback className="text-sm uppercase text-muted bg-foreground font-medium ">
                                        {familyMember?.firstName?.charAt(0)}{familyMember?.lastName?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                            <div className="flex flex-col ">
                                <p className="text-sm font-medium leading-none">{familyMember?.firstName} {familyMember?.lastName}</p>
                                <p className="text-xs">{familyMember?.email}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
