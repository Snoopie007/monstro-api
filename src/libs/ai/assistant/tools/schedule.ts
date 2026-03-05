import type { AssistantToolName } from "@subtrees/types/assistant";
import type { ToolExecutorContext, ToolExecutorResult } from "./shared";

type ScheduleDeps = {
  parseRangeDays: (input?: string) => number;
  buildScheduleContextText: (input: Record<string, unknown>, context: ToolExecutorContext) => string;
  parseRequestedDateTime: (text: string) => { year: number; month: number; day: number; hour: number; minute: number } | null;
  getLocationTimezone: (locationId: string) => Promise<string>;
  formatTimeHHMMSS: (parts: { hour: number; minute: number }) => string;
  extractMemberLookupSignals: (rawQuery: string) => {
    searchText: string;
    email: string | null;
    phoneDigits: string | null;
    tokens: string[];
  };
  scoreMemberCandidate: (candidate: { first_name: string | null; last_name: string | null; email: string; phone: string | null }, signals: any) => number;
  formatHumanDateInTimezone: (isoUtc: string, timezone: string) => string;
  db: any;
  sql: any;
};

export async function executeScheduleTool(params: {
  name: AssistantToolName;
  input: Record<string, unknown>;
  context: ToolExecutorContext;
  deps: ScheduleDeps;
}): Promise<ToolExecutorResult> {
  const { name, input, context, deps } = params;
  const {
    parseRangeDays,
    buildScheduleContextText,
    parseRequestedDateTime,
    getLocationTimezone,
    formatTimeHHMMSS,
    extractMemberLookupSignals,
    scoreMemberCandidate,
    formatHumanDateInTimezone,
    db,
    sql,
  } = deps;

    const action = typeof input.action === "string" ? input.action.toLowerCase() : "check";
    const rangeText = typeof input.dateRange === "string"
      ? input.dateRange
      : (typeof input.range === "string" ? input.range : "next 14 days");
    const days = parseRangeDays(rangeText);

    if (action !== "check" && context.confirmationIntent === "cancel") {
      return {
        content: JSON.stringify({
          ok: true,
          locationId: context.locationId,
          tool: name,
          action,
          status: "cancelled_by_user",
          cancelScope: "pending_request_only",
          existingReservationsChanged: false,
          message: "Cancelled as requested. I only cancelled the pending booking request; existing reservations were not changed.",
        }),
      };
    }

    if (action !== "check" && context.confirmationIntent !== "confirm") {
      return {
        content: JSON.stringify({
          ok: true,
          locationId: context.locationId,
          tool: name,
          action,
          status: "requires_confirmation",
          message: "Mutation actions are staged. Ask user to confirm exact schedule details before execution.",
          input,
        }),
      };
    }

    if (action === "create") {
      const scheduleText = buildScheduleContextText(input, context);
      const requestedDate = parseRequestedDateTime(scheduleText);
      const locationTimezone = await getLocationTimezone(context.locationId);
      const hasFirstAvailablePreference = /\b(first|earliest)\s+(time\s+slot|slot|available)\b/i.test(scheduleText);
      const hasExplicitTimeExpression = /(\b\d{1,2}:\d{2}\b)|(\b\d{1,2}\s*(am|pm)\b)/i.test(scheduleText);

      if (!requestedDate) {
        return {
          content: JSON.stringify({
            ok: false,
            locationId: context.locationId,
            tool: name,
            action,
            status: "needs_details",
            message: "I could not parse the requested booking date/time. Please provide it in a format like March 11, 2026 at 3 PM.",
          }),
        };
      }

      const dateText = `${requestedDate.year}-${String(requestedDate.month).padStart(2, "0")}-${String(requestedDate.day).padStart(2, "0")}`;
      const requestedLocalTime = formatTimeHHMMSS(requestedDate);
      const requestedLocalTimestamp = `${dateText} ${requestedLocalTime}`;
      const timingRows = await db.execute(sql`
        SELECT
          (${requestedLocalTimestamp}::timestamp AT TIME ZONE ${locationTimezone})::timestamptz AS start_utc,
          EXTRACT(DOW FROM ${requestedLocalTimestamp}::timestamp)::int AS local_dow,
          TO_CHAR(${requestedLocalTimestamp}::timestamp, 'HH24:MI:SS') AS local_time
      `) as unknown as Array<{ start_utc: string; local_dow: number; local_time: string }>;

      const timing = timingRows[0];
      if (!timing?.start_utc) {
        return {
          content: JSON.stringify({
            ok: false,
            locationId: context.locationId,
            tool: name,
            action,
            status: "needs_details",
            message: "I could not parse the requested date/time in this location timezone. Please provide the schedule details again.",
          }),
        };
      }

      if (new Date(timing.start_utc).getTime() < Date.now() && !hasFirstAvailablePreference) {
        return {
          content: JSON.stringify({
            ok: false,
            locationId: context.locationId,
            tool: name,
            action,
            status: "needs_details",
            message: "The requested booking date/time is in the past. Please provide a future date/time.",
          }),
        };
      }

      const memberSignals = extractMemberLookupSignals(scheduleText);
      if (!memberSignals.searchText) {
        return {
          content: JSON.stringify({
            ok: false,
            locationId: context.locationId,
            tool: name,
            action,
            status: "needs_details",
            message: "I could not identify the member to book. Please provide the member full name or email.",
          }),
        };
      }

      const memberLike = `%${memberSignals.searchText}%`;
      const memberEmailLike = memberSignals.email ? `%${memberSignals.email}%` : null;
      const memberPhoneLike = memberSignals.phoneDigits ? `%${memberSignals.phoneDigits}%` : null;
      const memberTokenLikes = memberSignals.tokens.map((token) => `%${token}%`);
      const memberEmailCondition = memberEmailLike ? sql`m.email ILIKE ${memberEmailLike}` : sql`false`;
      const memberPhoneCondition = memberPhoneLike
        ? sql`regexp_replace(COALESCE(m.phone, ''), '\\D', '', 'g') LIKE ${memberPhoneLike}`
        : sql`false`;

      const memberRows = await db.execute(sql`
        SELECT m.id, m.first_name, m.last_name, m.email, m.phone
        FROM member_locations ml
        JOIN members m ON m.id = ml.member_id
        WHERE ml.location_id = ${context.locationId}
          AND (
            concat_ws(' ', COALESCE(m.first_name, ''), COALESCE(m.last_name, '')) ILIKE ${memberLike}
            OR concat_ws(' ', COALESCE(m.last_name, ''), COALESCE(m.first_name, '')) ILIKE ${memberLike}
            OR m.email ILIKE ${memberLike}
            OR COALESCE(m.phone, '') ILIKE ${memberLike}
            OR (${memberEmailCondition})
            OR (${memberPhoneCondition})
            OR (${memberTokenLikes.length > 0 ? sql.join(memberTokenLikes.map((tokenLike) => sql`
                m.first_name ILIKE ${tokenLike}
                OR m.last_name ILIKE ${tokenLike}
                OR m.email ILIKE ${tokenLike}
                OR COALESCE(m.phone, '') ILIKE ${tokenLike}
              `), sql` OR `) : sql`false`})
          )
        ORDER BY m.created_at DESC
        LIMIT 30
      `) as unknown as Array<{
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string;
        phone: string | null;
      }>;

      const scoredMembers = memberRows
        .map((memberRow) => ({
          ...memberRow,
          score: scoreMemberCandidate(memberRow, memberSignals),
        }))
        .filter((memberRow) => memberRow.score > 0)
        .sort((a, b) => b.score - a.score);

      const member = scoredMembers[0];
      if (!member) {
        return {
          content: JSON.stringify({
            ok: false,
            locationId: context.locationId,
            tool: name,
            action,
            status: "needs_details",
            message: "I could not identify the member to book. Please provide the member full name or email.",
          }),
        };
      }

      const programRows = await db.execute(sql`
        SELECT id, name, capacity, allow_waitlist, waitlist_capacity
        FROM programs
        WHERE location_id = ${context.locationId}
          AND status = 'active'
        ORDER BY length(name) DESC, created_at DESC
      `) as unknown as Array<{
        id: string;
        name: string;
        capacity: number;
        allow_waitlist: boolean;
        waitlist_capacity: number;
      }>;

      const lowerText = scheduleText.toLowerCase();
      const program = programRows.find((row) => lowerText.includes(row.name.toLowerCase()));
      if (!program) {
        return {
          content: JSON.stringify({
            ok: false,
            locationId: context.locationId,
            tool: name,
            action,
            status: "needs_details",
            message: "I could not identify the program/session name. Please include the exact class name.",
            programSuggestions: programRows.slice(0, 10).map((row) => row.name),
          }),
        };
      }

      const requestedDay = Number(timing.local_dow);
      const slotRows = await db.execute(sql`
        SELECT
          ps.id,
          ps.day,
          ps.time,
          ps.duration,
          (((${dateText} || ' ' || to_char(ps.time, 'HH24:MI:SS'))::timestamp) AT TIME ZONE ${locationTimezone})::timestamptz AS start_utc,
          COALESCE(occ.confirmed_count, 0)::int AS confirmed_count
        FROM program_sessions ps
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS confirmed_count
          FROM reservations r
          WHERE r.location_id = ${context.locationId}
            AND r.session_id = ps.id
            AND r.start_on = (((${dateText} || ' ' || to_char(ps.time, 'HH24:MI:SS'))::timestamp) AT TIME ZONE ${locationTimezone})::timestamptz
            AND r.status IN ('confirmed', 'completed')
        ) occ ON true
        WHERE ps.program_id = ${program.id}
          AND ps.day = ${requestedDay}
        ORDER BY ps.time ASC
      `) as unknown as Array<{
        id: string;
        day: number;
        time: string;
        duration: number;
        start_utc: string;
        confirmed_count: number;
      }>;

      if (slotRows.length === 0) {
        const alternatives = await db.execute(sql`
          SELECT day, time, duration
          FROM program_sessions
          WHERE program_id = ${program.id}
          ORDER BY day, time
          LIMIT 5
        `) as unknown as Array<{ day: number; time: string; duration: number }>;

        return {
          content: JSON.stringify({
            ok: false,
            locationId: context.locationId,
            tool: name,
            action,
            status: "needs_details",
            message: "No sessions are configured for that date for this class. Please choose one of the configured schedule slots.",
            availableSessions: alternatives,
          }),
        };
      }

      const slots = slotRows.map((row) => {
        const capacity = Number(program.capacity || 0);
        const confirmedCount = Number(row.confirmed_count || 0);
        const remainingSpots = Math.max(capacity - confirmedCount, 0);
        const bookable = capacity <= 0 ? true : confirmedCount < capacity;
        return {
          id: row.id,
          day: Number(row.day || 0),
          time: row.time,
          duration: Number(row.duration || 0),
          startOnUtc: row.start_utc,
          startOnLocation: formatHumanDateInTimezone(row.start_utc, locationTimezone),
          confirmedReservations: confirmedCount,
          capacity,
          remainingSpots,
          bookable,
        };
      });

      let selectedSlot = null as null | (typeof slots[number]);

      if (hasFirstAvailablePreference || !hasExplicitTimeExpression) {
        selectedSlot = slots.find((slot) => slot.bookable) || null;
      } else {
        selectedSlot = slots.find((slot) => slot.time === timing.local_time) || null;
      }

      if (!selectedSlot) {
        return {
          content: JSON.stringify({
            ok: false,
            locationId: context.locationId,
            tool: name,
            action,
            status: "needs_details",
            message: "That specific session time is not available. Please choose one of the available slots for that day.",
            availableSlots: slots.slice(0, 5).map((slot) => ({
              startOnUtc: slot.startOnUtc,
              startOnLocation: slot.startOnLocation,
              remainingSpots: slot.remainingSpots,
              bookable: slot.bookable,
            })),
          }),
        };
      }

      if (!selectedSlot.bookable) {
        const alternative = slots.find((slot) => slot.bookable) || null;
        return {
          content: JSON.stringify({
            ok: false,
            locationId: context.locationId,
            tool: name,
            action,
            status: "needs_details",
            message: alternative
              ? "The requested slot is full. Please confirm if you want the next available bookable slot."
              : "The requested slot is full and there are no other bookable slots for that day.",
            requestedSlot: {
              startOnUtc: selectedSlot.startOnUtc,
              startOnLocation: selectedSlot.startOnLocation,
              capacity: selectedSlot.capacity,
              confirmedReservations: selectedSlot.confirmedReservations,
              remainingSpots: selectedSlot.remainingSpots,
            },
            nextAvailableSlot: alternative
              ? {
                  startOnUtc: alternative.startOnUtc,
                  startOnLocation: alternative.startOnLocation,
                  remainingSpots: alternative.remainingSpots,
                }
              : null,
          }),
        };
      }

      if (context.confirmationIntent !== "confirm") {
        return {
          content: JSON.stringify({
            ok: true,
            locationId: context.locationId,
            tool: name,
            action,
            status: "requires_confirmation",
            message: "I found an open slot and staged this booking. Please confirm to finalize.",
            bookingCandidate: {
              memberId: member.id,
              memberName: `${member.first_name || ""}${member.last_name ? ` ${member.last_name}` : ""}`.trim(),
              programId: program.id,
              programName: program.name,
              sessionId: selectedSlot.id,
              startOnUtc: selectedSlot.startOnUtc,
              startOnLocation: selectedSlot.startOnLocation,
              locationTimezone,
              capacity: selectedSlot.capacity,
              remainingSpots: selectedSlot.remainingSpots,
            },
          }),
        };
      }

      const startIso = selectedSlot.startOnUtc;
      const startDate = new Date(startIso);
      const endDate = new Date(startDate.getTime() + Number(selectedSlot.duration || 0) * 60 * 1000);
      const endIso = endDate.toISOString();

      const duplicateRows = await db.execute(sql`
        SELECT id
        FROM reservations
        WHERE location_id = ${context.locationId}
          AND member_id = ${member.id}
          AND session_id = ${selectedSlot.id}
          AND start_on = ${startIso}::timestamptz
          AND status IN ('confirmed', 'completed')
        LIMIT 1
      `) as unknown as Array<{ id: string }>;

      const existingReservation = duplicateRows.at(0);
      if (existingReservation) {
        return {
          content: JSON.stringify({
            ok: true,
            locationId: context.locationId,
            tool: name,
            action,
            status: "already_booked",
            reservationId: existingReservation.id,
            message: "This reservation already exists for the requested slot.",
          }),
        };
      }

      const insertRows = await db.execute(sql`
        INSERT INTO reservations (
          session_id,
          start_on,
          end_on,
          location_id,
          member_id,
          program_id,
          program_name,
          session_time,
          session_duration,
          session_day,
          status,
          is_make_up_class,
          updated_at
        ) VALUES (
          ${selectedSlot.id},
          ${startIso}::timestamptz,
          ${endIso}::timestamptz,
          ${context.locationId},
          ${member.id},
          ${program.id},
          ${program.name},
          ${selectedSlot.time}::time,
          ${selectedSlot.duration},
          ${selectedSlot.day},
          'confirmed',
          false,
          now()
        )
        RETURNING id
      `) as unknown as Array<{ id: string }>;

      return {
        content: JSON.stringify({
          ok: true,
          locationId: context.locationId,
          tool: name,
          action,
          status: "booked",
          reservationId: insertRows[0]?.id || null,
          memberName: `${member.first_name || ""}${member.last_name ? ` ${member.last_name}` : ""}`.trim(),
          programName: program.name,
          startOnUtc: startIso,
          locationTimezone,
          startOnLocation: formatHumanDateInTimezone(startIso, locationTimezone),
          message: "Reservation confirmed and created.",
        }),
      };
    }

    if (action !== "check") {
      return {
        content: JSON.stringify({
          ok: false,
          locationId: context.locationId,
          tool: name,
          action,
          status: "unsupported_action",
          message: "Only booking creation is supported right now for confirmed schedule actions.",
        }),
      };
    }

    const locationTimezone = await getLocationTimezone(context.locationId);
    const scheduleText = buildScheduleContextText(input, context);
    const normalizedScheduleText = scheduleText.toLowerCase();

    const programRows = await db.execute(sql`
      SELECT id, name
      FROM programs
      WHERE location_id = ${context.locationId}
        AND status = 'active'
      ORDER BY length(name) DESC, created_at DESC
    `) as unknown as Array<{ id: string; name: string }>;

    const matchedProgram = programRows.find((row) => normalizedScheduleText.includes(row.name.toLowerCase()));
    const explicitProgramInput = [input.programName, input.program]
      .filter((value) => typeof value === "string")
      .map((value) => (value as string).trim())
      .find((value) => value.length > 0);

    if (explicitProgramInput && !matchedProgram) {
      return {
        content: JSON.stringify({
          ok: false,
          locationId: context.locationId,
          tool: name,
          action: "check",
          status: "needs_details",
          message: `I could not find an active program matching "${explicitProgramInput}" at this location.`,
          programSuggestions: programRows.slice(0, 10).map((row) => row.name),
        }),
      };
    }

    const availabilityRows = await db.execute(sql`
      WITH local_days AS (
        SELECT
          gs::date AS local_date
        FROM generate_series(
          (now() AT TIME ZONE ${locationTimezone})::date,
          ((now() + (${days} * interval '1 day')) AT TIME ZONE ${locationTimezone})::date,
          interval '1 day'
        ) AS gs
      ),
      session_slots AS (
        SELECT
          p.id AS program_id,
          p.name AS program_name,
          p.capacity,
          p.allow_waitlist,
          p.waitlist_capacity,
          ps.id AS session_id,
          ps.day,
          ps.time,
          ps.duration,
          ld.local_date,
          ((ld.local_date::text || ' ' || to_char(ps.time, 'HH24:MI:SS'))::timestamp AT TIME ZONE ${locationTimezone})::timestamptz AS start_on_utc
        FROM programs p
        JOIN program_sessions ps ON ps.program_id = p.id
        JOIN local_days ld ON EXTRACT(DOW FROM ld.local_date)::int = ps.day
        WHERE p.location_id = ${context.locationId}
          AND p.status = 'active'
          ${matchedProgram ? sql`AND p.id = ${matchedProgram.id}` : sql``}
      ),
      upcoming_slots AS (
        SELECT *
        FROM session_slots
        WHERE start_on_utc >= now()
          AND start_on_utc < now() + (${days} * interval '1 day')
      ),
      occupancy AS (
        SELECT
          r.session_id,
          r.start_on,
          COUNT(*)::int AS confirmed_count
        FROM reservations r
        WHERE r.location_id = ${context.locationId}
          AND r.status IN ('confirmed', 'completed')
          AND r.start_on >= now()
          AND r.start_on < now() + (${days} * interval '1 day')
        GROUP BY r.session_id, r.start_on
      )
      SELECT
        us.program_id,
        us.program_name,
        us.session_id,
        us.day,
        us.time,
        us.duration,
        us.capacity,
        us.allow_waitlist,
        us.waitlist_capacity,
        us.start_on_utc,
        to_char(us.start_on_utc AT TIME ZONE ${locationTimezone}, 'YYYY-MM-DD HH24:MI:SS') AS start_on_location,
        COALESCE(o.confirmed_count, 0)::int AS confirmed_count
      FROM upcoming_slots us
      LEFT JOIN occupancy o
        ON o.session_id = us.session_id
       AND o.start_on = us.start_on_utc
      ORDER BY us.start_on_utc ASC
      LIMIT 240
    `) as unknown as Array<{
      program_id: string;
      program_name: string;
      session_id: string;
      day: number;
      time: string;
      duration: number;
      capacity: number;
      allow_waitlist: boolean;
      waitlist_capacity: number;
      start_on_utc: string;
      start_on_location: string;
      confirmed_count: number;
    }>;

    const availableSessions = availabilityRows.map((row) => {
      const capacity = Number(row.capacity || 0);
      const confirmedCount = Number(row.confirmed_count || 0);
      const remainingSpots = Math.max(capacity - confirmedCount, 0);
      const full = capacity > 0 ? confirmedCount >= capacity : false;
      const bookable = capacity <= 0 ? true : confirmedCount < capacity;
      const canJoinWaitlist = full && !!row.allow_waitlist;
      const status = bookable
        ? "bookable"
        : (canJoinWaitlist ? "full_waitlist_available" : "full_unavailable");

      return {
        programId: row.program_id,
        programName: row.program_name,
        sessionId: row.session_id,
        day: Number(row.day || 0),
        time: row.time,
        duration: Number(row.duration || 0),
        startOnUtc: row.start_on_utc,
        startOnLocation: row.start_on_location,
        capacity,
        confirmedReservations: confirmedCount,
        remainingSpots,
        allowWaitlist: !!row.allow_waitlist,
        waitlistCapacity: Number(row.waitlist_capacity || 0),
        bookable,
        status,
      };
    });

    const programMap = new Map<string, {
      programId: string;
      programName: string;
      totalUpcomingSessions: number;
      bookableSessions: number;
      nextBookableStartOnUtc: string | null;
      nextBookableStartOnLocation: string | null;
      minRemainingSpots: number | null;
    }>();

    for (const slot of availableSessions) {
      const current = programMap.get(slot.programId) || {
        programId: slot.programId,
        programName: slot.programName,
        totalUpcomingSessions: 0,
        bookableSessions: 0,
        nextBookableStartOnUtc: null,
        nextBookableStartOnLocation: null,
        minRemainingSpots: null,
      };

      current.totalUpcomingSessions += 1;
      if (slot.bookable) {
        current.bookableSessions += 1;
        if (!current.nextBookableStartOnUtc || new Date(slot.startOnUtc).getTime() < new Date(current.nextBookableStartOnUtc).getTime()) {
          current.nextBookableStartOnUtc = slot.startOnUtc;
          current.nextBookableStartOnLocation = slot.startOnLocation;
        }

        if (typeof current.minRemainingSpots !== "number") {
          current.minRemainingSpots = slot.remainingSpots;
        } else {
          current.minRemainingSpots = Math.min(current.minRemainingSpots, slot.remainingSpots);
        }
      }

      programMap.set(slot.programId, current);
    }

    const availablePrograms = Array.from(programMap.values())
      .sort((a, b) => {
        if (b.bookableSessions !== a.bookableSessions) return b.bookableSessions - a.bookableSessions;
        return a.programName.localeCompare(b.programName);
      });

    const bookableCount = availableSessions.filter((slot) => slot.bookable).length;
    const shownSessions = availableSessions.slice(0, 20);

    const message = matchedProgram
      ? (bookableCount > 0
        ? `Found ${bookableCount} bookable session${bookableCount === 1 ? "" : "s"} for ${matchedProgram.name} in the next ${days} days.`
        : `No bookable sessions found for ${matchedProgram.name} in the next ${days} days.`)
      : (bookableCount > 0
        ? `Found ${bookableCount} bookable session${bookableCount === 1 ? "" : "s"} across ${availablePrograms.length} program${availablePrograms.length === 1 ? "" : "s"} in the next ${days} days.`
        : `No bookable sessions found in the next ${days} days.`);

    return {
      content: JSON.stringify({
        ok: true,
        locationId: context.locationId,
        tool: name,
        action: "check",
        mode: "availability",
        timezone: locationTimezone,
        rangeDays: days,
        requestedProgram: matchedProgram?.name || null,
        availablePrograms,
        availableSessions: shownSessions,
        totalMatchingSessions: availableSessions.length,
        totalBookableSessions: bookableCount,
        message,
      }),
    };
  
}
