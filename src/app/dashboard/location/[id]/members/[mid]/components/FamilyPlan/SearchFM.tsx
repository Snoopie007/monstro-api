'use client';

import { Input, Label } from '@/components/forms';
import {
    Button, DialogClose,
    Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription,
    Avatar, AvatarImage,
} from '@/components/ui';
import { CirclePlusIcon, Loader2, User } from 'lucide-react';
import { FamilyMember } from '@/types/FamilyMember';
import { cn, sleep, tryCatch } from '@/libs/utils';
import { useMemo, useState } from 'react';
import { MemberPackage, MemberSubscription } from '@/types/member';
import { toast } from 'sonner';

interface SearchFMProps {
    setSlide: (slide: 'existing' | 'new') => void;
    onClose: () => void;
    parentPlan: MemberSubscription | MemberPackage;
    fms: FamilyMember[];
    familyPlans: MemberSubscription[] | MemberPackage[];
}

type SearchObject = {
    firstName: string;
    lastName: string;
    email: string;
};
export function SearchFM({ setSlide, parentPlan, fms, familyPlans, onClose }: SearchFMProps) {

    const [search, setSearch] = useState<SearchObject>({
        firstName: '',
        lastName: '',
        email: '',
    });
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'init' | 'found' | 'not found' | 'errors'>('init');
    const [familyMember, setFamilyMember] = useState<FamilyMember | null>(null);

    const filteredFMs = useMemo(() => {
        const attachedIds = new Set(familyPlans.map(plan => plan.member?.id));
        return fms.filter(fm => !attachedIds.has(fm.relatedMemberId));
    }, [fms, familyPlans]);

    async function handleSearch() {

        if ((!search.firstName && !search.lastName) && !search.email) {
            setStatus('errors');
            return;
        };
        setLoading(true);
        await sleep(2000);

        if (!filteredFMs || filteredFMs.length === 0) {
            return setStatus('not found');

        };
        let searchResult: FamilyMember | undefined;

        if (search.firstName && search.lastName) {
            searchResult = filteredFMs.find((fm) => {
                const m = fm.relatedMember;
                const hasFirstName = m?.firstName?.toLowerCase().includes(search.firstName.toLowerCase());
                const hasLastName = m?.lastName?.toLowerCase().includes(search.lastName.toLowerCase());
                return hasFirstName && hasLastName;
            });
        } else if (search.email) {
            searchResult = filteredFMs.find((fm) => {
                return fm.member?.email?.toLowerCase() === search.email.toLowerCase();
            });
        }

        setLoading(false);
        if (searchResult) {
            setFamilyMember(searchResult);
            setStatus('found');
        } else {
            setFamilyMember(null);
            setStatus('not found');
        }

    }

    async function handleAttach(familyMember: FamilyMember) {
        if (!familyMember) return;
        const { locationId, memberId, id } = parentPlan;

        const { result, error } = await tryCatch(
            fetch(`/api/protected/loc/${locationId}/members/${memberId}/subs/${id}/childs`, {
                method: "POST",
                body: JSON.stringify({
                    familyMemberId: familyMember.relatedMemberId,
                }),
            })
        );
        if (error || !result || !result.ok) {
            toast.error("Something went wrong. Please try again.");
            return;
        }

        const { familyMember: fm } = await result.json();
        setFamilyMember(fm);


        onClose();
    }



    return (
        <div className='space-y-2'>
            <div className='p-4 space-y-4'>
                <div className='bg-foreground/5 rounded-lg p-3 space-y-2'>
                    <div className='font-medium'>How does it work?</div>
                    <p className='text-sm '>
                        To protect member privacy,
                        you can only attach family members that you know
                        the first and last name or email address.

                    </p>
                    <p className='text-sm' >
                        You may search below by first and last name or email address to find the family member you're looking for.
                    </p>
                </div>
                <div className='space-y-2'>

                    <div className='grid grid-cols-2 gap-2'>
                        <div>
                            <Label size="tiny">First Name</Label>
                            <Input
                                placeholder='First Name'
                                className='bg-foreground/5'
                                value={search.firstName}
                                onChange={e => setSearch({ ...search, firstName: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label size="tiny">Last Name</Label>
                            <Input
                                placeholder='Last Name'
                                className='bg-foreground/5'
                                value={search.lastName}
                                onChange={e => setSearch({ ...search, lastName: e.target.value })}
                            />
                        </div>

                    </div>
                    <div>
                        <Label size="tiny">Email</Label>
                        <Input
                            placeholder='Email'
                            className='bg-foreground/5'
                            value={search.email}
                            onChange={e => setSearch({ ...search, email: e.target.value })}
                        />
                    </div>
                    {status === 'errors' && (
                        <p className='text-red-500 text-sm font-medium'>
                            Please enter a first name and last name or email address
                        </p>
                    )}
                </div>
                {status === 'found' && familyMember && (
                    <SearchResult familyMember={familyMember} onAttach={handleAttach} />
                )}
                {status === 'not found' && (
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <User className="size-5" />
                            </EmptyMedia>
                            <EmptyTitle>No family members found.</EmptyTitle>
                            <EmptyDescription>
                                Please ask the member to add this person you're looking for as a family member first on
                                the Monstro-X mobile app before proceeding.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
            </div>
            <div className="px-4 pb-4 flex justify-between flex-row">
                <Button variant="foreground" className='border-foreground/10'
                    onClick={() => setSlide('new')}> Add Child Account
                </Button>
                <div className='flex flex-row gap-2'>
                    <DialogClose asChild>
                        <Button variant="outline" className='border-foreground/10'  >
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button variant="primary" onClick={handleSearch} disabled={loading}>
                        {loading ? <Loader2 className="size-4 animate-spin" /> : 'Search'}
                    </Button>

                </div>
            </div>
        </div >
    );
}

interface SearchResultProps {
    familyMember: FamilyMember;
    onAttach: (familyMember: FamilyMember) => void;
}

function SearchResult({ familyMember, onAttach }: SearchResultProps) {
    const [loading, setLoading] = useState(false);
    async function handleAttach() {
        setLoading(true);
        await sleep(2000);
        await onAttach(familyMember);
        setLoading(false);
    }
    return (
        <div className="flex flex-row justify-between items-center bg-foreground/5 rounded-lg p-3">
            <div className="flex flex-row gap-3 items-center">
                <Avatar className="size-8">
                    <AvatarImage src={familyMember.member?.avatar || '/images/default-avatar.png'} />
                </Avatar>
                <div className='flex flex-row gap-4'>
                    <div className=" font-medium">
                        {familyMember.relatedMember?.firstName} {familyMember.relatedMember?.lastName}
                    </div>
                    <div className="  text-muted-foreground">
                        {familyMember.relationship}
                    </div>
                </div>
            </div>
            <Button variant="ghost" size="icon" className='size-8' onClick={handleAttach} disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <CirclePlusIcon className="size-5" />}
            </Button>
        </div>
    );
}