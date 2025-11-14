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
	EmptyDescription
} from "@/components/ui";
import { PhoneIcon, UserIcon } from "lucide-react";
import Link from "next/link";

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
			<div className="max-w-4xl mx-auto w-full space-y-4">

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
								const { staff, location, roles } = sl;
								return (
									<React.Fragment key={sl.id}>
										<Item>
											<ItemMedia>
												<Avatar>
													<AvatarImage src={staff?.avatar ?? ''} className="grayscale" />
													<AvatarFallback>{staff?.firstName?.charAt(0)} {staff?.lastName?.charAt(0)}</AvatarFallback>
												</Avatar>
											</ItemMedia>
											<ItemContent className="gap-1" >
												<ItemTitle>
													<Link href={`/dashboard/location/${params.id}/staffs/${staff?.id}`}>
														{staff?.firstName} {staff?.lastName}
													</Link>
												</ItemTitle>
												<ItemDescription>{staff?.email}</ItemDescription>

											</ItemContent>
											<ItemContent>
												<ItemTitle><PhoneIcon className="size-4" /> {staff?.phone ?? 'No phone number'}</ItemTitle>
											</ItemContent>
											<ItemContent>

											</ItemContent>
											<ItemContent className="gap-1" >
												<ItemTitle>Roles</ItemTitle>
												<div className="flex flex-row gap-1">
													{roles?.map((role) => (
														<Badge key={role.id} roles={role.color}>
															{role.name}
														</Badge>
													))}
												</div>
											</ItemContent>
										</Item>
										{index !== filteredStaffs.length - 1 && <ItemSeparator className="bg-foreground/5" />}
									</React.Fragment>
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
