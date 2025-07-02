"use client";

import { Input } from "@/components/forms";
import {
  Avatar,
  AvatarFallback,
  Button,
  DialogBody,
  DialogFooter,
} from "@/components/ui";
import { cn, tryCatch } from "@/libs/utils";
import { Member } from "@/types";
import { Loader2 } from "lucide-react";
import { AvatarImage } from "@radix-ui/react-avatar";
import { Dispatch, SetStateAction, useState } from "react";
import { toast } from "react-toastify";
import { set } from "date-fns";

interface SearchMemberProps {
  lid: string;
  parentId: string;
  familyMember: Member | null;
  setFamilyMember: Dispatch<SetStateAction<Member | null>>;
  reset: () => void;
}

export function SearchMember({
  lid,
  parentId,
  familyMember,
  setFamilyMember,
  reset,
}: SearchMemberProps) {
  const [searchEmail, setSearchEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  async function findExistingMember() {
    if (!searchEmail) return;
    setLoading(true);
    setSearchEmail(null);
    const { result, error } = await tryCatch(
      fetch(`/api/protected/loc/${lid}/search?email=${searchEmail}`)
    );
    setLoading(false);
    if (error || !result || !result.ok) {
      toast.error("Failed to find member");
      return;
    }

    const data = await result.json();

    if (data.id == parentId) {
      toast.error("You cannot add yourself as a family member");
      return;
    }
    setFamilyMember(data);
    setLoading(false);
  }

  return (
    <>
      <DialogBody>
        <div className="space-y-2">
          <Input
            type="email"
            placeholder="Search by email"
            value={searchEmail || ""}
            onChange={(e) => setSearchEmail(e.target.value)}
          />
          {familyMember && (
            <div className="flex flex-row bg-indigo-500 text-white gap-4 items-center border border-indigo-500 rounded-sm px-4 py-3">
              <div>
                <Avatar className="w-[35px] h-[35px] rounded-full mx-auto">
                  <AvatarImage src={familyMember?.avatar || ""} />
                  <AvatarFallback className="text-sm uppercase text-muted bg-foreground font-medium ">
                    {familyMember?.firstName?.charAt(0)}
                    {familyMember?.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex flex-col ">
                <p className="text-sm font-medium leading-none">
                  {familyMember?.firstName} {familyMember?.lastName}
                </p>
                <p className="text-xs">{familyMember?.email}</p>
              </div>
            </div>
          )}
        </div>
      </DialogBody>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          size={"xs"}
          onClick={() => {
            setSearchEmail(null);
            setFamilyMember(null);
            reset();
          }}
        >
          Cancel
        </Button>
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
      </DialogFooter>
    </>
  );
}
