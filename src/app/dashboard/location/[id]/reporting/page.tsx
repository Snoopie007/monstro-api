"use client";
import React, { use } from "react";
import { ScrollArea } from "@/components/ui";
import {
  RevenueChart,
  RecurringRevenueChart,
  NewCustomerChart,
  ChurnedMembers,
  TopSpenders,
  CustomerLTVChart,
  ReportDatePicker,
} from "./components";
import { ReportProvider, useReportFilters } from "./provider";
import { useReport } from "@/hooks/useReports";

interface ReportingContentProps {
  locationId: string;
}

function ReportingContent({ locationId }: ReportingContentProps) {
  const { filters } = useReportFilters();

  const { reports, isLoading, error, refetch } = useReport({
    locationId,
    startDate: filters.startDate,
    endDate: filters.endDate,
  });

  if (error) {
    return (
      <div className="flex flex-col gap-4 items-center justify-center h-[calc(100vh-50px)]">
        <div className="text-sm text-muted-foreground">
          Error loading reports: {error?.message || "Unknown error"}
        </div>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <ScrollArea className="w-full h-[calc(100vh-50px)] py-8">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <div className="flex flex-row justify-between gap-2 border-b border-foreground/10 pb-4">
          <h2 className="text-xl font-semibold">Reporting Overview</h2>
          <div>
            <ReportDatePicker />
          </div>
        </div>
        <div className="space-y-10">
          <div className="grid grid-cols-3 gap-12 border-b border-foreground/10 pb-10">
            <RevenueChart
              isLoading={isLoading}
              data={reports?.revenueData || []}
            />
            <RecurringRevenueChart
              isLoading={isLoading}
              data={reports?.recurringRevenueData || []}
            />
          </div>

          <div className="grid grid-cols-3 gap-12 border-b border-foreground/10 pb-10">
            <NewCustomerChart
              isLoading={isLoading}
              data={reports?.newMembersByMonth || []}
            />
            <CustomerLTVChart
              isLoading={isLoading}
              data={reports?.mltv || []}
            />
            <TopSpenders
              isLoading={isLoading}
              data={(reports?.topSpenders as any) || []}
            />
          </div>
          <div className="grid grid-cols-3 gap-12">
            <ChurnedMembers
              isLoading={isLoading}
              data={(reports?.recentCancelledMembers as any) || []}
            />
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

export default function Reporting(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);

  return (
    <ReportProvider>
      <ReportingContent locationId={id} />
    </ReportProvider>
  );
}
