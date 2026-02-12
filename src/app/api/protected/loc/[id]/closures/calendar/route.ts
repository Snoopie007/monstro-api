import { db } from "@/db/db";
import { and, eq, gte, lte, or } from "drizzle-orm";
import { reservationExceptions, locationState } from "@subtrees/schemas";
import { NextRequest, NextResponse } from "next/server";
import { COMMON_HOLIDAYS } from "@/app/dashboard/location/[id]/settings/closures/schemas";
import { getHolidayDate } from "@/libs/holidays";
import type { HolidaySettings } from "@subtrees/types/location";

type Props = {
  params: Promise<{ id: string }>;
};

interface ClosureResponse {
  date: string;
  reason: string;
  type: 'holiday' | 'maintenance';
  allDay: boolean;
}

export async function GET(req: NextRequest, props: Props) {
  const params = await props.params;
  const { searchParams } = new URL(req.url);
  
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  if (!startDateParam || !endDateParam) {
    return NextResponse.json(
      { error: "startDate and endDate query parameters are required" },
      { status: 400 }
    );
  }

  const startDate = new Date(startDateParam);
  const endDate = new Date(endDateParam);

  try {
    const closures: ClosureResponse[] = [];

    const [exceptions, locState] = await Promise.all([
      db.query.reservationExceptions.findMany({
        where: and(
          eq(reservationExceptions.locationId, params.id),
          or(
            eq(reservationExceptions.initiator, 'holiday'),
            eq(reservationExceptions.initiator, 'maintenance')
          ),
          gte(reservationExceptions.occurrenceDate, startDate),
          lte(reservationExceptions.occurrenceDate, endDate)
        ),
      }),
      db.query.locationState.findFirst({
        where: eq(locationState.locationId, params.id),
      }),
    ]);

    for (const exception of exceptions) {
      const exceptionDate = new Date(exception.occurrenceDate);
      
      if (exception.endDate) {
        const currentDate = new Date(exceptionDate);
        const exceptEndDate = new Date(exception.endDate);
        
        while (currentDate <= exceptEndDate && currentDate <= endDate) {
          if (currentDate >= startDate) {
            closures.push({
              date: currentDate.toISOString().split('T')[0]!,
              reason: exception.reason || (exception.initiator === 'holiday' ? 'Holiday' : 'Maintenance'),
              type: exception.initiator as 'holiday' | 'maintenance',
              allDay: true,
            });
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else {
        closures.push({
          date: exceptionDate.toISOString().split('T')[0]!,
          reason: exception.reason || (exception.initiator === 'holiday' ? 'Holiday' : 'Maintenance'),
          type: exception.initiator as 'holiday' | 'maintenance',
          allDay: true,
        });
      }
    }

    const holidaySettings = locState?.settings?.holidays as HolidaySettings | undefined;
    
    if (holidaySettings?.blockedHolidays && holidaySettings.blockedHolidays.length > 0) {
      const years = new Set<number>();
      let currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        years.add(currentDate.getFullYear());
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      for (const year of years) {
        for (const holidayId of holidaySettings.blockedHolidays) {
          const holiday = COMMON_HOLIDAYS.find(h => h.id === holidayId);
          if (!holiday) continue;

          const holidayDate = getHolidayDate(holiday, year);
          
          if (holidayDate >= startDate && holidayDate <= endDate) {
            const dateStr = holidayDate.toISOString().split('T')[0]!;
            
            const alreadyExists = closures.some(c => c.date === dateStr);
            if (!alreadyExists) {
              closures.push({
                date: dateStr,
                reason: holiday.name,
                type: 'holiday',
                allDay: true,
              });
            }
          }

          if (holidaySettings.advanceBlockDays > 0) {
            for (let i = 1; i <= holidaySettings.advanceBlockDays; i++) {
              const advanceDate = new Date(holidayDate);
              advanceDate.setDate(advanceDate.getDate() - i);
              
              if (advanceDate >= startDate && advanceDate <= endDate) {
                const dateStr = advanceDate.toISOString().split('T')[0]!;
                
                const alreadyExists = closures.some(c => c.date === dateStr);
                if (!alreadyExists) {
                  closures.push({
                    date: dateStr,
                    reason: `${i} day${i > 1 ? 's' : ''} before ${holiday.name}`,
                    type: 'holiday',
                    allDay: true,
                  });
                }
              }
            }
          }
        }
      }
    }

    closures.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json(closures, { status: 200 });
  } catch (err) {
    console.error(err);
    const error = err instanceof Error ? err.message : "Failed to fetch closures";
    return NextResponse.json({ error }, { status: 500 });
  }
}
