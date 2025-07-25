import { DateRange } from "react-day-picker";
import { Member } from "./member";

export interface ReportDateFilters {
  startDate?: Date;
  endDate?: Date;
  dateRange?: DateRange;
}

export interface ReportFilters extends ReportDateFilters {
  [key: string]: any;
}

export interface RevenueDataPoint {
  month: string;
  amount: number;
}

export interface RecurringRevenueDataPoint {
  month: string;
  amount: number;
}

export interface NewMemberDataPoint {
  month: string;
  count: number;
}

export interface TopSpender extends Partial<Member> {
  totalAmount: number;
}

export interface CancelledMember extends Partial<Member> {
  status?: string;
}

export interface MLTVDataPoint {
  month: string;
  amount: number;
}

export interface ReportData {
  transactions?: any[];
  revenueData?: RevenueDataPoint[];
  recurringRevenueData?: RecurringRevenueDataPoint[];
  newMembersByMonth?: NewMemberDataPoint[];
  topSpenders?: TopSpender[];
  recentCancelledMembers?: CancelledMember[];
  mltv?: MLTVDataPoint[];
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
}

export interface UseReportResult {
  reports: ReportData | undefined;
  isLoading: boolean;
  error: any;
  refetch: () => void;
}
