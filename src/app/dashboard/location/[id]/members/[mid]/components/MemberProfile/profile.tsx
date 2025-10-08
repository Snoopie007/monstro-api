"use client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  CardContent,
} from "@/components/ui";

import { ChevronLeft, Mail, PhoneCall } from "lucide-react";
import { useMemberStatus } from "../../providers/MemberContext";
import { useRouter } from "next/navigation";
import { MemberDeleteButton, MemberEditButton } from "../ContactInfo";
import { usePermission } from "@/hooks/usePermissions";

type MemberProfileData = {
  totalPointsEarned: number;
  lastSeenFormatted: string;
};

interface MemberProfileProps {
  params: { id: string; mid: string };
  profileData: MemberProfileData;
}

export function MemberProfile({ params, profileData }: MemberProfileProps) {
    const canDeleteMember = usePermission("delete member", params.id)
    const canEditMember = usePermission("edit member", params.id)
  const { member, ml } = useMemberStatus();
  const router = useRouter();

  const memberProfile = ml?.profile || member;

  return (
    <Card className="border-none">
      <CardContent className="px-0">
        <div className="flex justify-between flex-row items-center px-4 py-2 gap-2">
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
          <div className="flex flex-row space-x-2">
            {canDeleteMember && <MemberDeleteButton params={params} />}
            {canEditMember && <MemberEditButton params={params} />}
          </div>
        </div>

        <div className="flex px-4 py-4 gap-6">
          <div className="flex-initial relative">
            <Avatar className="w-20 h-20 rounded-full mx-auto">
              <AvatarImage src={memberProfile?.avatar || ""} />
              <AvatarFallback className="text-4xl uppercase text-muted bg-foreground font-medium">
                {(memberProfile?.firstName || memberProfile?.lastName)?.charAt(
                  0
                )}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex flex-initial w-[250px] ">
            <div className="flex flex-col  text-sm gap-1.5 ">
              <div className=" font-bold text-lg ">
                {memberProfile?.firstName}
              </div>
              <div className="flex flex-row gap-2 items-center">
                <Mail size={14} />
                <span>{memberProfile?.email}</span>
              </div>
              <div className="flex flex-row gap-2 items-center">
                <PhoneCall size={14} />
                <span>{memberProfile?.phone}</span>
              </div>
              <div className="flex flex-row gap-2 items-center">
                <strong>Last seen:</strong>
                <span>
                  {profileData.lastSeenFormatted}
                </span>
              </div>
            </div>
          </div>
          <div className="flex-1 flex flex-col text-sm gap-2">
            <div className="flex flex-col">
              <strong>Total Points Earned</strong>
              <span>{profileData.totalPointsEarned}</span>
            </div>
            <div className="flex flex-col">
              <strong className="">Current Points Balance</strong>
              <span>{ml?.points || 0}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
