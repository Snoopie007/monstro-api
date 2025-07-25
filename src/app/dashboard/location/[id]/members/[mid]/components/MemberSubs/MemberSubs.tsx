"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  CircleProgress,
  Skeleton,
} from "@/components/ui";
import { Input } from "@/components/forms";
import { formatAmountForDisplay } from "@/libs/utils";
import { MemberSubscription } from "@/types";
import { SubscriptionStatus, CreateSubscription, SubActions } from ".";
import { format } from "date-fns";
import { useState } from "react";
import { useMemberExistingSubscriptions } from "@/hooks";
import SectionLoader from "@/components/SectionLoading";

function calculateProgress(start: Date, end: Date) {
  const now = Date.now();
  const startDate = new Date(start);
  const endDate = new Date(end);
  const total = endDate.getTime() - startDate.getTime();
  const elapsed = now - startDate.getTime();
  const progress = (elapsed / total) * 100;

  return Math.min(Math.max(Number(progress.toFixed(2)), 10), 100); // Set minimum to 10%
}

const RowHeaders = [
  "Plan",
  "Duration",
  "Amount",
  "Total Collected",
  "Payment Type",
  "Next Invoice",
  "Status",
];

export function MemberSubs({
  params,
}: {
  params: { id: string; mid: string };
}) {
  const { existingSubscriptions, isLoading, fetchSubs } =
    useMemberExistingSubscriptions(params.id, params.mid);
  const [search, setSearch] = useState<string>("");

  return (
    <div className="space-y-0">
      <div className="w-full flex flex-row items-center px-4 py-2  bg-foreground/5  gap-2">
        <Input
          placeholder="Search subs..."
          className="w-auto bg-background border-foreground/10 h-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <CreateSubscription params={params} refetch={fetchSubs} />
      </div>
      <div className="border-y border-foreground/10">
        <Table className="">
          <TableHeader>
            <TableRow>
              {RowHeaders.map((header, i) => (
                <TableHead key={i} className="text-sm font-normal h-auto  py-2">
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                {Array.from({ length: 7 }).map((_, i) => (
                  <TableCell key={i}>
                    <Skeleton className="w-full h-4 bg-gray-100" />
                  </TableCell>
                ))}
              </TableRow>
            ) : (
              <SubscriptionRow
                subscriptions={existingSubscriptions || []}
                refetch={fetchSubs}
              />
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SubscriptionRow({
  subscriptions,
  refetch,
}: {
  subscriptions: MemberSubscription[];
  refetch: () => void;
}) {
  if (subscriptions.length < 1) {
    return (
      <TableRow>
        <TableCell colSpan={6} className="text-center">
          <p className="text-sm text-gray-500">No subscriptions found</p>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {subscriptions.map((sub: MemberSubscription) => (
        <TableRow key={sub.id} className="group ">
          <TableCell>
            <div className="flex flex-row items-center justify-between">
              <div className="flex flex-row gap-2 items-center">
                <div className="relative flex items-center justify-center w-5 h-5">
                  <CircleProgress
                    progress={calculateProgress(
                      sub.currentPeriodStart,
                      sub.currentPeriodEnd
                    )}
                  />
                </div>
                <span>{sub.plan?.name}</span>
              </div>
              <SubActions sub={sub} refetch={refetch} />
            </div>
          </TableCell>
          <TableCell>
            {format(sub.startDate, "MMM d, yyyy")} -{" "}
            {sub.endedAt ? format(sub.endedAt, "MMM d, yyyy") : "Never"}
          </TableCell>
          <TableCell>
            {formatAmountForDisplay(sub.plan?.price! / 100, "USD", true)} /{" "}
            {sub.plan?.interval}
          </TableCell>
          <TableCell></TableCell>
          <TableCell className="uppercase">{sub.paymentMethod}</TableCell>
          <TableCell>
            {sub.status !== "active" || sub.cancelAt
              ? "No future invoices"
              : format(sub.currentPeriodEnd, "MMM d, yyyy")}
          </TableCell>
          <TableCell>
            <SubscriptionStatus sub={sub} />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
