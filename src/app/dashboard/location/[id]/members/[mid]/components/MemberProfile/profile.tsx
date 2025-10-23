"use client";

import {
	Avatar,
	AvatarFallback,
	AvatarImage,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardTitle,
} from "@/components/ui";
import { usePermission } from "@/hooks/usePermissions";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { VisuallyHidden } from "react-aria";
import { useMemberStatus } from "../../providers/MemberContext";
import { ProfileActions } from "./ProfileActions";

type MemberProfileData = {
	lastSeenFormatted: string;
};

interface MemberProfileProps {
	params: { id: string; mid: string };
	pd: MemberProfileData;
}

export function MemberProfile({ params, pd }: MemberProfileProps) {
	const canDeleteMember = usePermission("delete member", params.id);
	const canEditMember = usePermission("edit member", params.id);

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
				<div className="flex flex-row gap-4 items-center">
					<Avatar className="size-20 rounded-full bg-foreground/5">
						<AvatarFallback>
							{memberProfile?.firstName?.charAt(0) || ""}
						</AvatarFallback>
						{memberProfile?.avatar && (
							<AvatarImage src={memberProfile.avatar} />
						)}
					</Avatar>

					<div className="flex flex-col gap-4 flex-1">
						<div className="space-y-0.5">
							<div className="font-bold text-lg leading-5">
								{memberProfile?.firstName} {memberProfile?.lastName}
							</div>
							<div className="flex flex-row gap-1 text-sm text-muted-foreground">
								<span>{memberProfile?.email}</span>
							</div>
							<div className="text-sm text-muted-foreground flex flex-row gap-4">
								<span>{memberProfile?.phone}</span>
								<span> Last seen: {pd.lastSeenFormatted}</span>
							</div>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
