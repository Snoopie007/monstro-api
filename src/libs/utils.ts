import { User } from "@/types";
import { type ClassValue, clsx } from "clsx";
import { decodeJwt } from "jose";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import duration from 'dayjs/plugin/duration';


dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(duration);

export const StripeCardOptions = {
  style: {
      base: {
          fontWeight: "500",
          fontFamily: "Roboto, Open Sans, Segoe UI, sans-serif",
          fontSize: "14px",
          fontSmoothing: "antialiased",
      },
      invalid: {
          iconColor: "#FFC7EE",
          color: "#FFC7EE",
      },
  },
};



 const formatAmountForDisplay = (
	amount: number,
	currency: string,
	withSymbol = true,
	minimumFractionDigits = 0
): string => {
	const formatter = new Intl.NumberFormat('en-US', {
		style: withSymbol ? 'currency' : 'decimal',
		currency,
		minimumFractionDigits,
	});
	
	return formatter.format(amount);
}

export function isExpired(dateTimeString: string) {
    const dateTime = new Date(dateTimeString);
    const currentDate = new Date();
    return dateTime < currentDate;
}

function cn(...inputs: ClassValue[]) {
  	return twMerge(clsx(inputs));
}
function sleep(ms: number) {
  	return new Promise((resolve) => setTimeout(resolve, ms));
}

function convertToCurrency(amount: number, symbol: string, currency: string): string {
  	return `${symbol}${amount} ${currency}`;
}


function ErrorHandler<T, E extends new (message?: string) => Error>(
	promise: Promise<T>,
	errorFilters: E[]
  	): Promise<[T, undefined] | [InstanceType<E>]> {
		return promise
			.then((data) => [data, undefined] as [T, undefined])
			.catch((error) => {
				if (errorFilters == undefined) {
				return [error]
			}
			if (errorFilters.some((filter) => error instanceof filter)) {
				return [error] 
			}
			throw error
	});
}

async function tryCatch<T, E = Error>(
    promise: Promise<T>
): Promise<{ error: E | null; result: T | null }> {
    try {
        const result = await promise;

        return { error: null, result };
    } catch (error) {
        return { error: error as E, result: null };
    }

}

function decodeJWT(JWT: string): User {
	return decodeJwt(JWT); 
}

const getCurrentTimeDetails = (durationTime: string, timeZone: string) => {
  // Get timezone from request header, default to 'UTC'
  const timezone = timeZone;

  // Get current time in specified timezone
  const currentTime = dayjs().tz(timezone);

  // Get current day of the week in lowercase
  const currentDayOfWeek = currentTime.format("dddd").toLowerCase();

  // Assuming `this.duration_time` is a JSON string (similar to Laravel)
  const duration = JSON.parse(durationTime || "null");

  return { currentTime, currentDayOfWeek, duration };
};

function getCurrentStatus(sessionData: any, userTimezone: any) {
	if (!sessionData || !sessionData.session || !sessionData.session.level || !sessionData.session.level.program) {
			return "Invalid Session Data";
	}

	const { session } = sessionData;
	console.log(session?.level?.program.location.timezone)
	const locationTimezone = session?.level?.program.location.timezone || 'UTC';

	// Convert session start and end dates to the program's timezone
	const startMoment = dayjs.tz(session.startDate, locationTimezone);
	const endMoment = dayjs.tz(session.endDate, locationTimezone);
	const currentTime = dayjs.tz(new Date(), locationTimezone);

	if (currentTime.isBefore(startMoment)) {
			return "Session Not Started";
	} else if (currentTime.isAfter(endMoment)) {
			return "Session Ended";
	} else {
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

			if (hours < 24 && days === 0) {
					return hours === 0 ? `Next session starts in ${minutes} minutes.` : `Next session starts in ${hours} hours and ${minutes} minutes.`;
			} else if (days < 2) {
					return `Next session starts tomorrow at ${convertedTime}`;
			} else {
					return `Next session starts on ${nextSessionDay} at ${convertedTime}`;
			}
	}
}

export {
  
  convertToCurrency,
  sleep,
  tryCatch,
  formatAmountForDisplay,
 
  cn,
	decodeJWT,
	getCurrentTimeDetails,
	getCurrentStatus
}


// export const zPhone = z.string().transform((arg, ctx) => {
//   const phone = parsePhoneNumberFromString(arg, {
//     // set this to use a default country when the phone number omits country code
//     defaultCountry: 'US',
    
//     // set to false to require that the whole string is exactly a phone number,
//     // otherwise, it will search for a phone number anywhere within the string
//     extract: false,
//   });

//   // when it's good
//   if (phone && phone.isValid()) {
//     return phone.number;
//   }

//   // when it's not
//   ctx.addIssue({
//     code: z.ZodIssueCode.custom,
//     message: 'Invalid phone number',
//   });
//   return z.NEVER;
// });