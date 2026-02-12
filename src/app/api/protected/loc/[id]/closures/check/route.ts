import { db } from "@/db/db";
import { and, eq, gte, lte, or } from "drizzle-orm";
import { reservationExceptions, locationState } from "@subtrees/schemas";
import { NextRequest, NextResponse } from "next/server";
import { COMMON_HOLIDAYS } from "@/app/dashboard/location/[id]/settings/closures/schemas";
import { getHolidayDate } from "@/libs/holidays";
import type { HolidaySettings, HolidayBehavior } from "@subtrees/types/location";

type Props = {
  params: Promise<{ id: string }>;
};

interface BlockedResponse {
  blocked: boolean;
  hardBlock?: boolean;
  reason?: string;
  initiator?: 'holiday' | 'maintenance';
  behavior?: HolidayBehavior;
  notify?: boolean;
}

export async function GET(req: NextRequest, props: Props) {
  const params = await props.params;
  const { searchParams } = new URL(req.url);
  
  const dateParam = searchParams.get('date');

  if (!dateParam) {
    return NextResponse.json(
      { error: "date query parameter is required" },
      { status: 400 }
    );
  }

  const checkDate = new Date(dateParam);
  const dateStr = checkDate.toISOString().split('T')[0];

  try {
    const [exceptions, locState] = await Promise.all([
      db.query.reservationExceptions.findMany({
        where: and(
          eq(reservationExceptions.locationId, params.id),
          or(
            eq(reservationExceptions.initiator, 'holiday'),
            eq(reservationExceptions.initiator, 'maintenance')
          ),
          or(
            and(
              lte(reservationExceptions.occurrenceDate, checkDate),
              or(
                gte(reservationExceptions.endDate, checkDate),
                eq(reservationExceptions.occurrenceDate, checkDate)
              )
            )
          )
        ),
      }),
      db.query.locationState.findFirst({
        where: eq(locationState.locationId, params.id),
      }),
    ]);

    for (const exception of exceptions) {
      const exceptionDateStr = new Date(exception.occurrenceDate).toISOString().split('T')[0];
      const endDateStr = exception.endDate 
        ? new Date(exception.endDate).toISOString().split('T')[0] 
        : exceptionDateStr;

      if (dateStr! >= exceptionDateStr! && dateStr! <= endDateStr!) {
        const response: BlockedResponse = {
          blocked: true,
          hardBlock: true,
          reason: exception.reason || (exception.initiator === 'holiday' ? 'Holiday' : 'Maintenance'),
          initiator: exception.initiator as 'holiday' | 'maintenance',
          behavior: 'block_all',
        };
        return NextResponse.json(response, { status: 200 });
      }
    }

    const holidaySettings = locState?.settings?.holidays as HolidaySettings | undefined;
    
    if (holidaySettings?.blockedHolidays && holidaySettings.blockedHolidays.length > 0) {
      const year = checkDate.getFullYear();

      for (const holidayId of holidaySettings.blockedHolidays) {
        const holiday = COMMON_HOLIDAYS.find(h => h.id === holidayId);
        if (!holiday) continue;

        const holidayDate = getHolidayDate(holiday, year);
        const holidayDateStr = holidayDate.toISOString().split('T')[0];

        if (dateStr === holidayDateStr) {
          const behavior = holidaySettings.defaultBehavior || 'block_all';
          
          if (behavior === 'notify_only') {
            const response: BlockedResponse = {
              blocked: false,
              notify: true,
              reason: holiday.name,
              initiator: 'holiday',
            };
            return NextResponse.json(response, { status: 200 });
          }

          const response: BlockedResponse = {
            blocked: true,
            hardBlock: behavior === 'block_all',
            reason: holiday.name,
            initiator: 'holiday',
            behavior,
          };
          return NextResponse.json(response, { status: 200 });
        }

        if (holidaySettings.advanceBlockDays > 0) {
          for (let i = 1; i <= holidaySettings.advanceBlockDays; i++) {
            const advanceDate = new Date(holidayDate);
            advanceDate.setDate(advanceDate.getDate() - i);
            const advanceDateStr = advanceDate.toISOString().split('T')[0];

            if (dateStr === advanceDateStr) {
              const behavior = holidaySettings.defaultBehavior || 'block_all';
              
              if (behavior === 'notify_only') {
                const response: BlockedResponse = {
                  blocked: false,
                  notify: true,
                  reason: `${i} day${i > 1 ? 's' : ''} before ${holiday.name}`,
                  initiator: 'holiday',
                };
                return NextResponse.json(response, { status: 200 });
              }

              const response: BlockedResponse = {
                blocked: true,
                hardBlock: behavior === 'block_all',
                reason: `${i} day${i > 1 ? 's' : ''} before ${holiday.name}`,
                initiator: 'holiday',
                behavior,
              };
              return NextResponse.json(response, { status: 200 });
            }
          }
        }
      }
    }

    const response: BlockedResponse = { blocked: false };
    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    console.error(err);
    const error = err instanceof Error ? err.message : "Failed to check closure status";
    return NextResponse.json({ error }, { status: 500 });
  }
}
