// ============================================================================
// Calendar View Types
// ============================================================================

import type { Member } from "../member";

export type CalendarView = "month" | "week" | "day" | "agenda";

// ============================================================================
// Calendar Closure Types
// ============================================================================

export interface ClosedDate {
  date: string;
  reason: string;
  type: 'holiday' | 'maintenance';
  allDay?: boolean;
}

// ============================================================================
// Calendar Event Types
// ============================================================================

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  staff: CalendarEventStaff;
  // UI-specific fields (optional)
  description?: string;
  allDay?: boolean;
  color?: EventColor;
  location?: string;
  // Attendance-specific fields (optional)
  duration?: number;
  data?: CalendarEventData;
}

export type CalendarEventStaff = {
  id: string;
  name: string;
  avatar?: string | null;
};

export type EventColor =
  | "sky"
  | "amber"
  | "violet"
  | "rose"
  | "emerald"
  | "orange"
  | "cyan"
  | "pink"
  | "indigo"
  | "teal"
  | "lime"
  | "red";

export type CalendarEventData = {
  reservationId?: string;
  programId: string;
  sessionId: string;
  members: CalendarEventMember[];
  memberReservations?: CalendarEventMemberReservation[];
  memberPlanId?: string[] | null;
  // Status tracking for attendance
  isMakeUpClass?: boolean;
  status?: 'confirmed' | 'cancelled_by_member' | 'cancelled_by_vendor' | 'cancelled_by_holiday' | 'completed' | 'no_show';
  hasCheckIn?: boolean; // Whether members checked in
};

export type CalendarEventMemberReservation = {
  memberId: string;
  reservationId: string;
};

export type CalendarEventMember = {
  memberId?: string;
  name: string;
  avatar?: string | null;
};

export interface MemberWithValidation extends Member {
  hasValidAccess: boolean;
  accessType?: "subscription" | "package";
  accessDetails?: string;
}

export interface SessionManagementDialogProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
  onDelete: (eventId: string) => void;
  lid?: string;
  onRemoveReservation?: (
    event: CalendarEvent,
    memberId: string
  ) => Promise<void>;
  onRefreshEvents?: () => void;
  onMemberUpdate?: () => void;
}
