"use client";

import {
	Avatar,
	AvatarImage,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardTitle,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { VisuallyHidden } from "react-aria";
import { useMemberStatus } from "../../providers/MemberContext";
import { ProfileActions } from "./ProfileActions";
import { format } from "date-fns";
import { FamilyMember } from "@/types/FamilyMember";
import { cn } from "@/libs/utils";




export function MemberProfile({ params }: { params: { id: string; mid: string } }) {

	const { member, ml } = useMemberStatus();
	const router = useRouter();

	const memberProfile = ml?.profile || member;

	return (
		<Card className="border-none bg-muted/50 rounded-lg p-3">
			<VisuallyHidden className="p-0">
				<CardTitle></CardTitle>
				<CardDescription></CardDescription>
			</VisuallyHidden>

			<CardContent className="space-y-4 px-0">
				<div className="flex justify-between flex-row items-center">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => {
							router.back();
						}}
						className="bg-foreground/5 size-6"
					>
						<ChevronLeft className="size-4" />
					</Button>
					<div className="flex flex-row group">
						<ProfileActions params={params} />
					</div>
				</div>
				<div className="flex flex-row gap-4 ">
					<Avatar className="size-18 rounded-full bg-foreground/5">
						<AvatarImage src={memberProfile.avatar || '/images/default-avatar.png'} />
					</Avatar>
					<div className="flex flex-col gap-4 flex-1">
						<div className="flex flex-row gap-10 items-center ">
							<div className="space-y-1">
								<div className="text-xs text-muted-foreground">
									Name
								</div>
								<div className="text-sm font-medium">
									{memberProfile?.firstName} {memberProfile?.lastName}
								</div>

							</div>
							<div className="space-y-1">
								<div className="text-xs text-muted-foreground">Birthday</div>
								<div className="text-sm font-medium">
									{member.dob ? format(member.dob, 'MMM d, yyyy') : 'Unknown'}
								</div>
							</div>
							<div className="space-y-1">
								<div className="text-xs text-muted-foreground">
									Gender
								</div>
								<div className="text-sm font-medium">
									{member.gender}
								</div>
							</div>

						</div>
						<div className="flex flex-row gap-10 items-center ">
							<div className="space-y-1">
								<div className="text-xs text-muted-foreground">
									Email
								</div>
								<div className="text-sm font-medium">
									{memberProfile?.email}
								</div>

							</div>
							<div className="space-y-1">
								<div className="text-xs text-muted-foreground">
									Phone
								</div>
								<div className="text-sm font-medium">{memberProfile?.phone}</div>
							</div>
						</div>

						{ml.knownFamilyMembers && ml.knownFamilyMembers.length > 0 && (
							<div className="flex flex-row gap-10 items-center ">
								<div className="space-y-1">
									<div className="text-xs text-muted-foreground">
										Last seen
									</div>
									<div className="text-sm font-medium">
										{ml.lastCheckInTime ? format(ml.lastCheckInTime, 'MMM d, yyyy hh:mm a') : 'n/a'}
									</div>
								</div>
								<div className="space-y-1">
									<div className="text-xs text-muted-foreground">
										Know Family Members
									</div>
									<div className="flex flex-row gap-1 relative">
										{ml.knownFamilyMembers.map((familyMember, index) => (
											<FamilyMembers key={familyMember.id} familyMember={familyMember} />
										))}
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}


interface FamilyMembersProps {
	familyMember: FamilyMember;
}

function FamilyMembers({ familyMember, }: FamilyMembersProps) {

	const m = familyMember.relatedMember;
	return (
		<Tooltip>
			<TooltipTrigger asChild>

				<Avatar className={cn("size-6 rounded-lg bg-foreground/5 ")}>
					<AvatarImage src={m?.avatar || '/images/default-avatar.png'} />
				</Avatar>
			</TooltipTrigger>
			<TooltipContent>
				<div>
					<div className="text-sm font-medium">{m?.firstName} {m?.lastName}</div>
					<div className="text-xs text-muted-foreground">{familyMember.relationship}</div>
				</div>
			</TooltipContent>
		</Tooltip>

	)
}