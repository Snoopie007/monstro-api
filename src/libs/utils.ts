import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";


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



export {
	sleep,
	tryCatch,
	formatAmountForDisplay,
  	cn,
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