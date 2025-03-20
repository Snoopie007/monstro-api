import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Time } from '@internationalized/date';

export function stringToTime(time: string) {
    return new Time(parseInt(time.split(":")[0]), parseInt(time.split(":")[1]));
}


export const StripeCardOptions = {
  style: {
      base: {
          fontWeight: "500",
          fontFamily: "Roboto, Open Sans, Segoe UI, sans-serif",
          fontSize: "14px",
          fontSmoothing: "antialiased",
      },
      invalid: {
          iconColor: "#fd0034",
          color: "#fd0034",
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


function cn(...inputs: ClassValue[]) {
  	return twMerge(clsx(inputs));
}
function sleep(ms: number) {
  	return new Promise((resolve) => setTimeout(resolve, ms));
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

function formatTime(timeString: string | undefined): string {
	if (!timeString) return '';

	const [hours, minutes] = timeString.split(':').map(Number);
	const period = hours >= 12 ? 'PM' : 'AM';

	const displayHours = hours % 12 || 12;

	return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}


function formatEmail(email: string) {
	if (!email) return '';
	const [username, domain] = email.split('@') || [];
	return `${username?.substring(0, 2)}${'*'.repeat(username?.length - 2)}@${domain}`;
  }
  
function formatPhone(phone: string) {
	if (!phone) return '';
	const lastThreeDigits = phone.slice(-4);
	return `${'*'.repeat(phone.length - 4)}${lastThreeDigits}`;
}


/**
 * Replaces placeholders in the given template string with corresponding values from the data object.
 *
 * @param template - The template string containing placeholders in the form of {{key}}.
 * @param data - An object containing key-value pairs, where keys match placeholders in the template.
 * @returns A string with placeholders replaced by their corresponding values from the data object.
 *          If a placeholder's key is not found in the data, the placeholder remains unchanged.
 */

function interpolateMsg(template: string, data: Record<string, any>): string {
	return template.replace(/\{\{([^}]+)\}\}/g, (match: string, p1: string): string => {
		// Split the path into parts (e.g. "user.name" -> ["user", "name"])
		const parts = p1.trim().split('.');

		// Traverse the object following the path
		let value: Record<string, any> = data;
		for (const part of parts) {
		if (value === undefined || value === null) return match;
		value = value[part];
		}

		return String(value ?? match);
	});
}
  

export {
	sleep,
	tryCatch,
	formatAmountForDisplay,
  	cn,	
	formatTime,
	formatEmail,
	formatPhone,
	interpolateMsg,
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