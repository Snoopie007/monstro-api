
import { decodeJwt } from "jose";
import { User } from "@/types/user";
import { NextRequest } from "next/server";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import duration from 'dayjs/plugin/duration';
import { Member } from "@/types/member";
import { JwtPayload } from "jsonwebtoken";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(duration);



function authenticateMember(req: NextRequest): { member: Member } {
    const token = req.headers.get("Authorization")?.split(" ")[1]
    const authMember = decodeJwt(token ?? "");
    if (!authMember) {
        throw new Error("Access denied");
    }
    return authMember as { member: Member };
}


const getCurrentTimeDetails = (durationTime: Record<string, number>, timeZone: string) => {
    // Get timezone from request header, default to 'UTC'
    const timezone = timeZone;

    // Get current time in specified timezone
    const currentTime = dayjs().tz(timezone);

    // Get current day of the week in lowercase
    const currentDayOfWeek = currentTime.format("dddd").toLowerCase();

    // Assuming `this.duration_time` is a JSON string (similar to Laravel)
    const duration = durationTime;

    return { currentTime, currentDayOfWeek, duration };
};

function getCurrentStatus(sessionData: any, userTimezone: any) {
    if (!sessionData || !sessionData.session || !sessionData.session.level || !sessionData.session.level.program) {
        return "Invalid Session Data";
    }

    const { session } = sessionData;

    const locationTimezone = session?.level?.program.location.timezone || 'UTC';

    // Convert session start and end dates to the program's timezone
    const startMoment = dayjs.tz(session.startDate, locationTimezone);
    const endMoment = dayjs.tz(session.endDate, locationTimezone);
    const currentTime = dayjs.tz(new Date(), locationTimezone);

    if (currentTime.isBefore(startMoment)) return "Session Not Started";

    if (currentTime.isAfter(endMoment)) return "Session Ended";

    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const currentDayOfWeek = currentTime.format('dddd').toLowerCase();
    let nextClassDayIndex = daysOfWeek.indexOf(currentDayOfWeek);
    let daysToAdd = 0;

    // Find the next available session day
    for (let i = 0; i <= 7; i++) {
        let nextDayIndex = (nextClassDayIndex + i) % 7;
        let nextDay = daysOfWeek[nextDayIndex];

        if (session[nextDay]) {
            daysToAdd = i;
            break;
        }
    }

    let nextSessionDate = currentTime.add(daysToAdd, 'days');
    let nextSessionDay = nextSessionDate.format('dddd').toLowerCase();

    // Get start time for the next session
    let startTime = dayjs.tz(`${nextSessionDate.format('YYYY-MM-DD')} ${session[nextSessionDay]}`, 'YYYY-MM-DD HH:mm:ss', locationTimezone);

    let duration = JSON.parse(session.duration_time || '{}');
    let sessionDuration = duration[nextSessionDay] || 0;

    let endTime = startTime.add(sessionDuration, 'minutes');

    // If the session is currently in progress
    if (currentTime.isAfter(startTime) && currentTime.isBefore(endTime)) {
        return 'In Progress';
    }

    // Calculate time until next session
    let timeUntilNextSession = dayjs.duration(startTime.diff(currentTime));
    let hours = timeUntilNextSession.hours() + (timeUntilNextSession.days() * 24);
    let minutes = timeUntilNextSession.minutes();
    let days = timeUntilNextSession.days();

    // Convert time to user's timezone
    let convertedTime = startTime.tz(userTimezone).format('h:mm A');

    if (hours < 24 && days === 0) return hours === 0 ? `Next session starts in ${minutes} minutes.` : `Next session starts in ${hours} hours and ${minutes} minutes.`;

    if (days < 2) return `Next session starts tomorrow at ${convertedTime}`;

    return `Next session starts on ${nextSessionDay} at ${convertedTime}`;

}

export { authenticateMember, getCurrentTimeDetails, getCurrentStatus };