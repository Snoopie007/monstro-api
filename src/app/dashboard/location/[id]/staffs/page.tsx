"use client";
import React, { use, useEffect, useMemo, useState } from "react";
import ErrorComponent from "@/components/error";
import { useStaffLocations } from "@/hooks/useStaffs";
import { useRoles } from "@/hooks/useRoles";
import InviteStaff from "./components/InviteStaff";
import { Input } from "@/components/forms";
import {
	Badge,
	Item, ItemMedia, ItemContent, Avatar,
	ItemGroup, AvatarImage, AvatarFallback, ItemTitle, ItemDescription, ItemActions, ItemSeparator,
	Empty,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
	EmptyDescription,
	InfoField
} from "@/components/ui";
import { PhoneIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/libs/utils";
import { format } from "date-fns";

interface StaffsPageProps {
	params: Promise<{
		id: string;
	}>;
}

export default function StaffsPage(props: StaffsPageProps) {
	const params = use(props.params);
	const { sls, isLoading, error, mutate } = useStaffLocations(params.id);

	const [searchQuery, setSearchQuery] = useState<string>("");
	const { roles,
		isLoading: isRolesLoading,
		error: isRolesError,
	} = useRoles(params.id);


	const filteredStaffs = useMemo(() => {
		if (searchQuery.length > 0) {
			return sls.filter((s) => s.staff?.firstName.toLowerCase().includes(searchQuery.toLowerCase()) || s.staff?.lastName.toLowerCase().includes(searchQuery.toLowerCase()));
		}
		return sls;
	}, [sls, searchQuery]);

	if (error) return <ErrorComponent error={error} />;



	return (
		<div className="flex flex-col pr-2 pb-2 h-full">
			<div className="max-w-6xl mx-auto w-full space-y-4">

				<div className="flex flex-row  items-center gap-2 justify-between ">
					<Input
						placeholder="Find a staff..."
						value={searchQuery}
						onChange={(event) => setSearchQuery(event.target.value)}
						className="h-10 w-[300px] bg-foreground/5"
						variant="search"
					/>

					{!isRolesLoading && !isRolesError && (
						<InviteStaff roles={roles} lid={params.id} />
					)}
				</div>
				<div className="bg-muted/50  rounded-lg ">
					{!isLoading && filteredStaffs.length > 0 && (
						<ItemGroup>
							{filteredStaffs.map((sl, index) => {
								const { staff, roles } = sl;
								return (
									<div key={sl.id} className={cn(
										"flex flex-row items-center justify-between gap-3 p-3 border-b border-foreground/5",
										"last:border-b-0"
									)}>

										<div className="flex-shrink-0">
											<Avatar className="size-12">
												<AvatarImage src={staff?.avatar ?? ''} className="grayscale" />
												<AvatarFallback>{staff?.firstName?.charAt(0)} {staff?.lastName?.charAt(0)}</AvatarFallback>
											</Avatar>
										</div>
										<div className="grid grid-cols-6 gap-2 items-center flex-1">
											<div className="flex flex-col items-start col-span-2">
												<Link href={`/dashboard/location/${params.id}/staffs/${staff?.id}`}>
													<span className="text-sm font-bold">{staff?.firstName} {staff?.lastName}</span>
												</Link>
												<span className="text-sm text-muted-foreground truncate max-w-48">{staff?.email}</span>
											</div>
											<div className="flex flex-col  col-span-1">
												<span className="text-sm">Phone</span>
												<span className="text-sm">{staff?.phone ?? 'No phone number'}</span>
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
												<span className="text-sm text-muted-foreground">{format(staff?.created || new Date(), 'MMM d, yyyy')}</span>
											</div>
										</div>
										<div className="flex-shrink-0">

										</div>
									</div>
								)
							})}
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
