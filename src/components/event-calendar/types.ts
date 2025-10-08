
import { CalendarEvent as OldCalendarEvent } from "@/types";

export type CalendarView = "month" | "week" | "day" | "agenda"

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: Date
  end: Date
  allDay?: boolean
  color?: EventColor
  location?: string
  staff: CalendarEventStaff;
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

  

  // Types for member data
export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  memberLocation: {
    status: string;
  };
}

export interface MemberWithValidation extends Member {
  hasValidAccess: boolean;
  accessType?: "subscription" | "package";
  accessDetails?: string;
}

// Extend CalendarEvent to include original data
export interface ExtendedCalendarEvent extends CalendarEvent {
  __originalData?: OldCalendarEvent["data"];
}

export interface EnhancedEventDialogProps {
  event: ExtendedCalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
  onDelete: (eventId: string) => void;
  lid?: string;
  onRemoveReservation?: (
    event: OldCalendarEvent,
    memberId: string
  ) => Promise<void>;
  onRefreshEvents?: () => void;
  onMemberUpdate?: () => void;
}