# User Stories: Holiday & Closures Feature

> **Epic**: Enable vendors to manage facility closures and holiday blocking with automatic member notifications
> 
> **Status**: In Progress  
> **Sprint**: TBD  
> **Last Updated**: January 9, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Context](#architecture-context)
3. [User Stories](#user-stories)
   - [US-1: Enforce Holiday Blocking on Reservations](#us-1-enforce-holiday-blocking-on-reservations)
   - [US-2: Enforce Holiday Blocking on Makeup Classes](#us-2-enforce-holiday-blocking-on-makeup-classes)
   - [US-3: Display Blocked Days on Calendar](#us-3-display-blocked-days-on-calendar)
   - [US-4: Implement Holiday Behavior Modes](#us-4-implement-holiday-behavior-modes)
   - [US-5: Implement Advance Block Days](#us-5-implement-advance-block-days)
   - [US-6: Auto-Generate Holiday Exceptions](#us-6-auto-generate-holiday-exceptions)
   - [US-7: Holiday Cancellation Notifications](#us-7-holiday-cancellation-notifications)
   - [US-8: Makeup Class Notifications](#us-8-makeup-class-notifications)
   - [US-9: Timezone-Safe Holiday Calculation](#us-9-timezone-safe-holiday-calculation)
   - [US-10: Member Attendance View Holiday Indicators](#us-10-member-attendance-view-holiday-indicators)
4. [Technical Debt](#technical-debt)
5. [Dependencies](#dependencies)

---

## Overview

The Holiday & Closures feature allows vendors to:
- Select common US holidays to automatically block
- Create custom closures for maintenance or special events
- Configure blocking behavior (block all, block new only, notify only)
- Set advance warning periods before holidays
- Automatically notify members when their reservations are affected

### Current State

The UI and settings storage are implemented, but **the blocking logic is not enforced anywhere**. This document outlines the work required to make the feature functional end-to-end.

---

## Architecture Context

### Repositories

| Repo | Purpose |
|------|---------|
| `monstro-15` | Next.js frontend + API routes (this repo) |
| `monstro-api` | Elysia backend with BullMQ email queue |

### Existing Infrastructure (monstro-api)

```typescript
// Email queue - ready to use
import { emailQueue } from "@/libs/queues";

await emailQueue.add('send-email', {
  to: member.email,
  subject: 'Subject',
  template: 'TemplateName',
  metadata: { ... }
});
```

### Key Files

| File | Purpose |
|------|---------|
| `src/libs/holidays.ts` | Holiday date calculation utilities |
| `src/types/location.ts` | `HolidaySettings` type definition |
| `src/app/dashboard/.../closures/` | Settings UI components |
| `src/app/api/.../exceptions/` | Exception CRUD endpoints |
| `src/app/api/.../settings/holidays/` | Holiday settings endpoint |

---

## User Stories

---

### US-1: Enforce Holiday Blocking on Reservations

**As a** vendor  
**I want** blocked holidays to prevent new reservations  
**So that** members cannot book classes on days my facility is closed

#### Priority: **Critical**

#### Current Behavior
- Vendor selects blocked holidays in settings
- Settings are saved to `location_state.settings.holidays.blockedHolidays[]`
- **No blocking occurs** - members can still book on holidays

#### Implementation Plan

1. **Create holiday checking utility** (`src/libs/holidays.ts`)
   ```typescript
   export async function isDateBlocked(
     locationId: string,
     date: Date
   ): Promise<{ blocked: boolean; reason?: string; initiator?: string }>
   ```

2. **Modify reservation creation endpoint** (`src/app/api/protected/loc/[id]/reservations/route.ts`)
   - Before creating reservation, call `isDateBlocked()`
   - If blocked and behavior is `block_all` or `block_new_only`, return 400 error
   - Include reason in response for UI feedback

3. **Modify recurring reservation endpoint** (`src/app/api/protected/loc/[id]/members/[mid]/reservations/route.ts`)
   - Check start date against blocked dates
   - For recurring, also check if pattern would hit blocked dates

#### Acceptance Criteria

- [ ] `POST /reservations` returns 400 when date is blocked with `block_all` behavior
- [ ] `POST /reservations` returns 400 when date is blocked with `block_new_only` behavior
- [ ] `POST /reservations` succeeds with warning when behavior is `notify_only`
- [ ] Error response includes: `{ error: "Date blocked", reason: "Christmas Day", initiator: "holiday" }`
- [ ] Blocking respects both HolidayDefaults AND custom closures (reservation_exceptions)

#### Test Cases

```typescript
describe('Holiday Blocking - Reservations', () => {
  it('blocks reservation on Christmas when block_all is set')
  it('blocks reservation on custom maintenance closure')
  it('allows reservation on non-blocked day')
  it('allows reservation when notify_only behavior')
  it('checks both common holidays and custom exceptions')
})
```

---

### US-2: Enforce Holiday Blocking on Makeup Classes

**As a** vendor  
**I want** blocked holidays to prevent makeup class scheduling  
**So that** members cannot reschedule missed classes to days my facility is closed

#### Priority: **Critical**

#### Current Behavior
- Member can schedule makeup class on any future date
- No validation against blocked dates or closures

#### Implementation Plan

1. **Modify makeup reservation endpoint** (`src/app/api/protected/loc/[id]/reservations/makeup/route.ts`)
   - Import and call `isDateBlocked()` utility
   - Return 400 if date is blocked

2. **Update ScheduleMakeupDialog** (`src/app/dashboard/.../MemberAttendance/ScheduleMakeupDialog.tsx`)
   - Disable blocked dates in calendar picker
   - Fetch blocked dates when dialog opens
   - Show visual indicator on blocked dates

#### Acceptance Criteria

- [ ] `POST /reservations/makeup` returns 400 when target date is blocked
- [ ] Calendar picker in dialog shows blocked dates as disabled
- [ ] Blocked dates have visual indicator (e.g., strikethrough, red background)
- [ ] Tooltip on blocked date shows reason ("Christmas Day - Holiday")

#### Files to Modify

- `src/app/api/protected/loc/[id]/reservations/makeup/route.ts`
- `src/app/dashboard/location/[id]/members/[mid]/components/MemberAttendance/ScheduleMakeupDialog.tsx`

---

### US-3: Display Blocked Days on Calendar

**As a** vendor  
**I want** to see blocked days highlighted on the calendar  
**So that** I can visualize my facility's closure schedule

#### Priority: **High**

#### Current Behavior
- Calendar shows sessions and reservations only
- No visual indication of holidays or closures
- `/api/protected/loc/[id]/events` doesn't return closure data

#### Implementation Plan

1. **Create closures endpoint for calendar** (`src/app/api/protected/loc/[id]/closures/calendar/route.ts`)
   ```typescript
   GET /api/protected/loc/[id]/closures/calendar?startDate=X&endDate=Y
   
   Response: Array<{
     date: string;
     type: 'holiday' | 'maintenance';
     reason: string;
     allDay: boolean;
   }>
   ```

2. **Modify events route** (`src/app/api/protected/loc/[id]/events/route.ts`)
   - Add optional `includeClosure=true` query param
   - Merge closure dates into response

3. **Update MonthView component** (`src/components/event-calendar/MonthView.tsx`)
   - Accept `closedDates` prop
   - Render blocked days with distinct styling (gray background, diagonal stripes)
   - Show tooltip on hover with closure reason

4. **Update CalendarPageClient** (`src/app/dashboard/location/[id]/calendar/ClientComponent.tsx`)
   - Fetch closures alongside events
   - Pass to EventCalendar component

#### Acceptance Criteria

- [ ] Blocked days have distinct visual styling (not clickable for creating events)
- [ ] Hover/click on blocked day shows reason tooltip
- [ ] Both common holidays and custom closures are displayed
- [ ] Multi-day closures show range correctly
- [ ] Performance: closures fetched with events in single request OR cached

#### Design Mockup

```
┌─────────────────────────────────────────┐
│  December 2026                          │
├────┬────┬────┬────┬────┬────┬────┤
│ Su │ Mo │ Tu │ We │ Th │ Fr │ Sa │
├────┼────┼────┼────┼────┼────┼────┤
│    │    │  1 │  2 │  3 │  4 │  5 │
│    │    │    │    │    │    │    │
├────┼────┼────┼────┼────┼────┼────┤
│ ...                                     │
├────┼────┼────┼────┼────┼────┼────┤
│ 20 │ 21 │ 22 │ 23 │████│████│████│  ← 24-26 blocked
│    │    │    │    │XMAS│XMAS│    │    (Christmas)
└────┴────┴────┴────┴────┴────┴────┘
```

---

### US-4: Implement Holiday Behavior Modes

**As a** vendor  
**I want** to choose how holidays affect reservations  
**So that** I have flexibility in managing my schedule

#### Priority: **High**

#### Behavior Modes

| Mode | Description |
|------|-------------|
| `block_all` | Block all reservations on holiday (existing + new) |
| `block_new_only` | Allow existing reservations, block new ones |
| `notify_only` | Allow all reservations, but notify members |

#### Current Behavior
- UI allows selecting behavior mode
- Setting is saved to database
- **Behavior is never read or enforced**

#### Implementation Plan

1. **Update `isDateBlocked()` utility**
   - Accept behavior mode parameter
   - Return different results based on mode:
     - `block_all`: `{ blocked: true, hardBlock: true }`
     - `block_new_only`: `{ blocked: true, hardBlock: false, allowExisting: true }`
     - `notify_only`: `{ blocked: false, notify: true }`

2. **Modify reservation endpoints**
   - `block_all`: Reject reservation, cancel existing
   - `block_new_only`: Reject new, allow modifications to existing
   - `notify_only`: Allow but flag for notification

3. **Add notification queuing for `notify_only`**
   - When reservation created on holiday with `notify_only`:
     - Create reservation normally
     - Queue notification email to member

#### Acceptance Criteria

- [ ] `block_all` prevents all reservations and cancels existing
- [ ] `block_new_only` prevents new reservations but keeps existing
- [ ] `notify_only` allows reservations but sends warning email
- [ ] Behavior mode is read from location settings at check time
- [ ] Changing behavior mode affects future checks (not cached)

---

### US-5: Implement Advance Block Days

**As a** vendor  
**I want** to block reservations X days before a holiday  
**So that** I can prevent last-minute bookings before closures

#### Priority: **Medium**

#### Current Behavior
- `advanceBlockDays` setting exists in UI (0-30 days)
- Setting is saved but **never used**

#### Implementation Plan

1. **Update `isDateBlocked()` utility**
   ```typescript
   // If advanceBlockDays = 7 and holiday is Dec 25
   // Block dates from Dec 18 - Dec 25
   
   function isInAdvanceBlockPeriod(
     checkDate: Date,
     holidayDate: Date,
     advanceBlockDays: number
   ): boolean
   ```

2. **Modify blocking logic**
   - Calculate advance block window for each holiday
   - Include in blocking check
   - Return distinct reason: "Advance block: 3 days before Christmas"

#### Acceptance Criteria

- [ ] Setting `advanceBlockDays: 7` blocks Dec 18-24 for Christmas
- [ ] `advanceBlockDays: 0` only blocks the holiday itself
- [ ] Advance block period shows distinct reason in error
- [ ] Advance blocked dates show on calendar with different styling

---

### US-6: Auto-Generate Holiday Exceptions

**As a** vendor  
**I want** blocked common holidays to automatically create exception records  
**So that** the calendar and queries work consistently

#### Priority: **Medium**

#### Problem Statement
Currently two parallel systems exist:
1. `HolidayDefaults` → `location_state.settings.holidays.blockedHolidays[]`
2. `CustomClosures` → `reservation_exceptions` table

These don't sync. Calendar queries exceptions table but holiday settings are separate.

#### Implementation Plan

**Option A: Sync on Save (Recommended)**

1. When vendor saves HolidayDefaults:
   - Calculate holiday dates for current year + next year
   - Upsert exception records for each selected holiday
   - Remove exception records for unselected holidays

2. **Modify** `PATCH /settings/holidays` endpoint:
   ```typescript
   // After saving settings
   await syncHolidayExceptions(locationId, blockedHolidays);
   ```

3. **Create sync function**:
   ```typescript
   async function syncHolidayExceptions(
     locationId: string,
     blockedHolidayIds: number[]
   ): Promise<void>
   ```

**Option B: Query Both (Alternative)**

1. Modify calendar/blocking queries to check both:
   - `reservation_exceptions` table
   - `location_state.settings.holidays.blockedHolidays` + calculate dates

#### Acceptance Criteria

- [ ] Selecting "Christmas" in HolidayDefaults creates exception for Dec 25
- [ ] Unselecting holiday removes the auto-generated exception
- [ ] Auto-generated exceptions are marked (e.g., `source: 'holiday_default'`)
- [ ] Manual exceptions are not affected by holiday sync
- [ ] Sync handles year rollover (creates for next year in December)

---

### US-7: Holiday Cancellation Notifications

**As a** member  
**I want** to be notified when my reservation is cancelled due to a holiday  
**So that** I can reschedule my class

#### Priority: **High**

#### Integration Point
Uses existing email queue in `monstro-api`:
```typescript
import { emailQueue } from "@/libs/queues";
```

#### Implementation Plan

1. **Create email template** (`monstro-api/src/emails/HolidayCancellationEmail.tsx`)
   - Member name
   - Cancelled class details (name, date, time)
   - Reason for cancellation (holiday name)
   - Link to reschedule / schedule makeup

2. **Create notification endpoint** (`monstro-api/src/routes/protected/locations/notifications/holiday.ts`)
   ```typescript
   POST /api/protected/loc/:id/notifications/holiday-cancellation
   
   Body: {
     memberIds: string[];
     holidayName: string;
     holidayDate: string;
     affectedReservations: Array<{
       reservationId: string;
       className: string;
       originalDate: string;
     }>;
   }
   ```

3. **Integrate with exception creation**
   - When creating holiday/maintenance exception
   - Query affected reservations
   - If `autoNotifyMembers` is true, queue notifications

4. **Queue notification from monstro-15**
   ```typescript
   // In exception creation endpoint
   if (settings.holidays?.autoNotifyMembers) {
     await fetch(`${API_URL}/api/protected/loc/${locationId}/notifications/holiday-cancellation`, {
       method: 'POST',
       body: JSON.stringify({ ... })
     });
   }
   ```

#### Acceptance Criteria

- [ ] Email sent when reservation cancelled due to holiday
- [ ] Email includes: class name, original date, holiday name
- [ ] Email has "Schedule Makeup" CTA button
- [ ] Notification respects `autoNotifyMembers` setting
- [ ] Batch notifications (one email per member, not per reservation)

#### Email Template Structure

```
Subject: Your [Class Name] class on [Date] has been cancelled

Hi [First Name],

Your upcoming class has been cancelled due to a facility closure:

📅 [Class Name]
📆 [Original Date] at [Time]
❌ Reason: [Holiday Name]

You can schedule a makeup class at your convenience.

[Schedule Makeup Class] (button)

Questions? Contact [Location Name] at [Location Email].
```

---

### US-8: Makeup Class Notifications

**As a** member  
**I want** to receive confirmation when I schedule a makeup class  
**So that** I know my rescheduled class is confirmed

#### Priority: **Medium**

#### Implementation Plan

1. **Create email template** (`monstro-api/src/emails/MakeupClassConfirmationEmail.tsx`)
   - Member name
   - New class details
   - Original missed class reference
   - Credits remaining

2. **Trigger notification on makeup creation**
   - After successful `POST /reservations/makeup`
   - Queue confirmation email

#### Acceptance Criteria

- [ ] Confirmation email sent when makeup class scheduled
- [ ] Email shows new date/time and original class reference
- [ ] Email shows remaining makeup credits
- [ ] Only sent if member has email notifications enabled

---

### US-9: Timezone-Safe Holiday Calculation

**As a** developer  
**I want** holiday dates calculated in the location's timezone  
**So that** Christmas is Dec 25 local time, not UTC

#### Priority: **Medium**

#### Current Behavior
```typescript
// Current: Uses local server timezone
return new Date(year, parsed.month - 1, parsed.day!);
```

#### Implementation Plan

1. **Add timezone to location settings** (if not exists)
   - Default to 'America/Los_Angeles' for US locations

2. **Update `getHolidayDate()` function**
   ```typescript
   import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';
   
   export function getHolidayDate(
     holiday: Holiday,
     year: number,
     timezone: string
   ): Date
   ```

3. **Pass timezone through all holiday checks**

#### Acceptance Criteria

- [ ] Christmas is Dec 25 in location's timezone
- [ ] Holiday check uses location's timezone, not server's
- [ ] Date comparisons account for timezone
- [ ] API responses include timezone context

---

### US-10: Member Attendance View Holiday Indicators

**As a** staff member  
**I want** to see holidays marked on the member attendance calendar  
**So that** I understand why a member has no attendance on certain days

#### Priority: **Low**

#### Current Behavior
- Attendance MonthView shows attended/missed days
- No indication of facility closures

#### Implementation Plan

1. **Fetch closures in attendance data**
   - Include closure dates in attendance API response

2. **Update MonthView component** (`src/app/dashboard/.../MemberAttendance/MonthView.tsx`)
   - Add distinct styling for closure days
   - Don't show "missed" indicator on closure days

#### Acceptance Criteria

- [ ] Closure days have distinct styling (e.g., gray with icon)
- [ ] Closure days don't count as "missed" classes
- [ ] Hover shows closure reason
- [ ] Distinguishes between holiday and maintenance

---

## Technical Debt

### TD-1: Migration Script Edge Case

**Issue**: Holiday ID migration checks only first array element
```sql
WHERE jsonb_typeof(settings->'holidays'->'blockedHolidays'->0) = 'string';
```

**Risk**: Partially migrated arrays won't be re-processed

**Fix**: Check all elements or use a migration flag

---

### TD-2: Missing Reason Validation for Maintenance

**Issue**: `ClosureSchema` allows empty reason for maintenance type

**Fix**: Add conditional validation
```typescript
reason: z.string().optional().refine(
  (val, ctx) => ctx.parent.type !== 'maintenance' || (val && val.length > 0),
  { message: 'Reason required for maintenance closures' }
)
```

---

### TD-3: Legacy String ID Support

**Issue**: Frontend has legacy ID mapping code that should be removed after migration

**Location**: `HolidayDefaults.tsx` lines 25-33

**Fix**: Remove after confirming all locations are migrated

---

## Dependencies

| Story | Depends On |
|-------|------------|
| US-2 | US-1 (uses same blocking utility) |
| US-4 | US-1 (extends blocking behavior) |
| US-5 | US-1 (extends blocking check) |
| US-6 | US-1 (blocking needs consistent data) |
| US-7 | US-6 (needs exception records to trigger) |
| US-3 | US-6 (calendar needs exception data) |
| US-8 | US-2 (triggered by makeup creation) |
| US-10 | US-3 (similar visual treatment) |

### Recommended Implementation Order

1. **Phase 1 - Core Blocking** (Critical)
   - US-1: Enforce blocking on reservations
   - US-2: Enforce blocking on makeup classes

2. **Phase 2 - Data Consistency**
   - US-6: Auto-generate holiday exceptions
   - US-9: Timezone-safe calculation

3. **Phase 3 - Visual Feedback**
   - US-3: Calendar blocked day display
   - US-10: Attendance view indicators

4. **Phase 4 - Behavior & Notifications**
   - US-4: Implement behavior modes
   - US-5: Advance block days
   - US-7: Holiday cancellation notifications
   - US-8: Makeup confirmation notifications

---

## Appendix: API Contracts

### GET /api/protected/loc/[id]/closures/check

Check if a date is blocked.

```typescript
// Request
GET /api/protected/loc/abc123/closures/check?date=2026-12-25

// Response (blocked)
{
  "blocked": true,
  "hardBlock": true,
  "reason": "Christmas Day",
  "initiator": "holiday",
  "behavior": "block_all"
}

// Response (not blocked)
{
  "blocked": false
}

// Response (notify only)
{
  "blocked": false,
  "notify": true,
  "reason": "Christmas Day",
  "initiator": "holiday"
}
```

### POST /api/protected/loc/[id]/notifications/holiday-cancellation

Queue holiday cancellation notifications (calls monstro-api).

```typescript
// Request
{
  "holidayName": "Christmas Day",
  "holidayDate": "2026-12-25",
  "affectedMembers": [
    {
      "memberId": "mem_123",
      "email": "john@example.com",
      "firstName": "John",
      "reservations": [
        {
          "id": "res_456",
          "className": "Yoga Basics",
          "originalTime": "2026-12-25T10:00:00Z"
        }
      ]
    }
  ]
}

// Response
{
  "queued": 5,
  "jobIds": ["job_1", "job_2", ...]
}
```
