import { 
  reservations, 
  reservationExceptions,
} from '@subtrees/schemas/reservations';
import { Member } from '../member';
import { Program } from '../program';

// Reservation status type derived from enum
export type ReservationStatus = 
  | 'confirmed'
  | 'cancelled_by_member'
  | 'cancelled_by_vendor'
  | 'cancelled_by_holiday'
  | 'completed'
  | 'no_show';

// Exception initiator type derived from enum
export type ExceptionInitiator = 
  | 'member'
  | 'vendor'
  | 'holiday'
  | 'maintenance';

// Base reservation type from schema
export type Reservation = typeof reservations.$inferSelect;

// Extended reservation with relations
export type ReservationWithRelations = Reservation & {
  member?: Member;
  program?: Program;
  session?: {
    id: string;
    time: string;
    duration: number;
    day: number;
    programId: string;
  };
  originalReservation?: Reservation;
};

// Unified exception type (repurposed from recurring_reservations_exceptions)
export type ReservationException = typeof reservationExceptions.$inferSelect;

// Input types for creating reservations
export type CreateReservationInput = {
  sessionId?: string; // Nullable for make-up classes
  memberId: string;
  locationId: string;
  startOn: Date;
  endOn: Date;
  memberSubscriptionId?: string;
  memberPackageId?: string;
  // Denormalized fields
  programId?: string;
  programName?: string;
  sessionTime?: string;
  sessionDuration?: number;
  sessionDay?: number;
  staffId?: string;
  // Make-up class
  isMakeUpClass?: boolean;
  originalReservationId?: string;
};

// Input types for exceptions
export type CreateExceptionInput = {
  reservationId?: string;
  locationId?: string;
  sessionId?: string;
  occurrenceDate: Date;
  endDate?: Date;
  initiator: ExceptionInitiator;
  reason?: string;
  createdBy?: string;
};

// Make-up class input
export type CreateMakeUpClassInput = {
  memberId: string;
  locationId: string;
  startOn: Date;
  endOn: Date;
  originalReservationId: string;
  memberSubscriptionId?: string;
  memberPackageId?: string;
  // Optional session binding
  sessionId?: string;
  // Denormalized program info (required if no sessionId)
  programId?: string;
  programName?: string;
  staffId?: string;
};

// Response type for cancellation operations
export type CancellationResult = {
  cancelledReservations: number;
  // Legacy compatibility for routes not yet migrated off recurring logic
  cancelledRecurringReservations?: number;
  exceptionsCreated: number;
  notificationsSent?: number;
};
