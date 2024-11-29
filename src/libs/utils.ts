import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const StripeCardOptions = {
  style: {
      base: {
          fontWeight: "500",
          fontFamily: "Roboto, Open Sans, Segoe UI, sans-serif",
          fontSize: "15px",
          fontSmoothing: "antialiased",
      },
      invalid: {
          iconColor: "#FFC7EE",
          color: "#FFC7EE",
      },
  },
};
const DateFormateOptions: Intl.DateTimeFormatOptions = {
	month: 'short',
	day: 'numeric',
	year: 'numeric',
}

 function formatAmountForDisplay(
	amount: number,
	currency: string,
	style: boolean = true,
	fractionDigit?: number | undefined
): string {
	let numberFormat = new Intl.NumberFormat(['en-US'], {
		currency: currency,
		currencyDisplay: 'symbol',
		maximumFractionDigits: fractionDigit || 0,
		...(style ? { style: 'currency' } : {}),
	})
  	return numberFormat.format(amount)
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

function formatDateTime(date: number, format?:  Intl.DateTimeFormatOptions ): string {
  	return new Date(date).toLocaleString('en-US', format || DateFormateOptions);
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

export {
  formatDateTime,
  convertToCurrency,
  sleep,
  formatAmountForDisplay,
  DateFormateOptions,
  cn
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