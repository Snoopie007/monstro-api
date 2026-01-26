"use client";
import React, { use, useMemo, useState } from "react";
import ErrorComponent from "@/components/error";
import { useStaffLocations } from "@/hooks/useStaffs";
import { useRoles } from "@/hooks/useRoles";
import { InviteStaff } from "./components";
import { Input } from "@/components/forms";
import {
	Badge,
	Avatar,
	ItemGroup,
	AvatarImage,
	Empty,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
	EmptyDescription,
	Button
} from "@/components/ui";
import { ChevronRight, UserIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/libs/utils";
import { format } from "date-fns";
import { StaffLocation } from "@/types/staff";

interface StaffsPageProps {
	params: Promise<{
		id: string;
	}>;
}

export default function StaffsPage(props: StaffsPageProps) {
	const params = use(props.params);
	const { sls, isLoading, error } = useStaffLocations(params.id);
	const [searchQuery, setSearchQuery] = useState<string>("");
	const { roles, isLoading: isRolesLoading, error: isRolesError } = useRoles(params.id);


	const filteredStaffs = useMemo(() => {
		if (searchQuery.length > 0) {
			return sls.filter((s) => {
				const { staff } = s;
				const query = searchQuery.toLowerCase();
				return (
					staff?.firstName.toLowerCase().includes(query)
					|| staff?.lastName.toLowerCase().includes(query)
					|| staff?.phone.toLowerCase().includes(query)
					|| staff?.email.toLowerCase().includes(query)
				);
			});
		}
		return sls;
	}, [sls, searchQuery]);

	if (error) return (
		<ErrorComponent error={error} />
	);


	return (
		<div className="flex flex-col pr-2 pb-2 h-full">
			<div className="max-w-6xl mx-auto w-full space-y-4">

				<div className="flex flex-row  items-center gap-2 justify-between ">
					<Input
						placeholder="Find a staff..."
						className="h-10 w-[300px] bg-foreground/5"
						value={searchQuery}
						onChange={(event) => setSearchQuery(event.target.value)}
						variant="search"
					/>

					{!isRolesLoading && !isRolesError && (
						<InviteStaff roles={roles} lid={params.id} />
					)}
				</div>
				<div className="bg-muted/50  rounded-lg ">
					{!isLoading && filteredStaffs.length > 0 && (
						<ItemGroup>
							{filteredStaffs.map((sl) => (
								<StaffItem key={sl.id} sl={sl} lid={params.id} />
							))}
						</ItemGroup>
					)}
					{!isLoading && filteredStaffs.length === 0 && (
						<Empty >
							<EmptyHeader>
								<EmptyMedia variant="icon">
									<UserIcon className="size-5" />
								</EmptyMedia>
								<EmptyTitle>No staffs found</EmptyTitle>
								<EmptyDescription>Add a new staff to get started</EmptyDescription>
							</EmptyHeader>
						</Empty>
					)}
				</div>

			</div>

		</div>
	);
}


function StaffItem({ sl, lid }: { sl: StaffLocation, lid: string }) {
	const { staff, roles } = sl;
	const defaultAvatar = staff?.user?.image || '/images/default-avatar.png';
	return (
		<div key={sl.id} className={cn(
			"flex flex-row items-center justify-between gap-3 p-3 border-b border-foreground/5",
			"last:border-b-0"
		)}>

			<div className="flex-shrink-0">
				<Avatar className="size-12">
					<AvatarImage src={defaultAvatar} className="grayscale" />

				</Avatar>
			</div>
			<div className="grid grid-cols-6 gap-2 items-center flex-1">
				<div className="flex flex-col items-start col-span-2">
					<span className="text-sm font-bold">{staff?.firstName} {staff?.lastName}</span>
					<span className="text-sm text-muted-foreground truncate max-w-48">{staff?.email}</span>
				</div>
				<div className="flex flex-col  col-span-1">
					<span className="text-sm">Phone</span>
					<span className="text-sm">
						{staff?.phone || '-'}
					</span>
				</div>
				<div className="flex flex-col col-span-2">
					<span className="text-sm">Roles</span>
					<div className="flex flex-row gap-2">
						{roles && roles.length > 0 ? (
							roles?.map((r) => (
								<Badge key={r.id} roles={r.color}>
									{r.name}
								</Badge>
							))
						) : (
							<span className="text-sm text-muted-foreground">No roles</span>
						)}
					</div>
				</div>
				<div className="flex flex-col col-span-1">
					<span className="text-sm">Joined</span>
					<span className="text-sm text-muted-foreground">
						{format(staff?.created || new Date(), 'MMM d, yyyy')}
					</span>
				</div>
			</div>
			<div className="flex-shrink-0">
				<Button variant="ghost" size="icon" className="size-8 " asChild>
					<Link href={`/dashboard/location/${lid}/staffs/${staff?.id}`}>
						<ChevronRight className="size-4" />
					</Link>
				</Button>
			</div>
		</div>
	)
}