import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

export class WorkflowDelayValidationError extends Error {
	readonly kind = "validation" as const;
}

const LOCAL_DATETIME = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/;
const OFFSET_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

function record(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function isSameLocalDateTime(value: Date, local: string, timezone: string) {
	return formatInTimeZone(value, timezone, "yyyy-MM-dd'T'HH:mm") === local;
}

/**
 * A value with Z or an offset already describes an exact moment.
 * A value without an offset is a wall-clock time at the workflow's location.
 * Invalid and repeated daylight-saving times are rejected instead of guessed.
 */
export function parseWorkflowWakeAt(value: string, timezone: string): Date {
	if (OFFSET_DATETIME.test(value)) {
		const exact = new Date(value);
		if (Number.isNaN(exact.getTime())) throw new WorkflowDelayValidationError("Delay date/time is invalid");
		return exact;
	}

	const match = LOCAL_DATETIME.exec(value);
	if (!match) throw new WorkflowDelayValidationError("Delay date/time must use YYYY-MM-DDTHH:mm");
	const local = `${match[1]}T${match[2]}`;
	let instant: Date;
	try {
		instant = fromZonedTime(local, timezone);
		if (!isSameLocalDateTime(instant, local, timezone)) {
			throw new WorkflowDelayValidationError("Delay date/time does not exist in the location timezone");
		}

		// When clocks move backward, the same local time can happen twice.
		// Search nearby moments and reject this value if a second match exists.
		for (let minutes = 1; minutes <= 180; minutes += 1) {
			for (const direction of [-1, 1]) {
				const candidate = new Date(instant.getTime() + direction * minutes * 60_000);
				if (isSameLocalDateTime(candidate, local, timezone)) {
					throw new WorkflowDelayValidationError("Delay date/time is ambiguous in the location timezone");
				}
			}
		}
	} catch (error) {
		if (error instanceof WorkflowDelayValidationError) throw error;
		throw new WorkflowDelayValidationError(`Location timezone is invalid: ${timezone}`);
	}
	return instant;
}

export function calculateWorkflowWakeAt(
	data: unknown,
	timezone: string,
	now: Date,
): Date {
	const root = record(data);
	const delay = record(root.delay);
	const mode = delay.mode;
	if (mode === "duration") {
		const units = ["days", "hours", "minutes"] as const;
		const values = units.map((unit) => delay[unit]);
		if (values.some((value) => value !== undefined && (!Number.isInteger(value) || Number(value) < 0))) {
			throw new WorkflowDelayValidationError("Delay duration values must be non-negative whole numbers");
		}
		const [days = 0, hours = 0, minutes = 0] = values.map((value) => Number(value ?? 0));
		const milliseconds = (((days * 24 + hours) * 60 + minutes) * 60_000);
		if (!Number.isSafeInteger(milliseconds) || milliseconds <= 0) {
			throw new WorkflowDelayValidationError("Delay duration must be greater than zero and within a safe range");
		}
		const wakeAt = new Date(now.getTime() + milliseconds);
		if (!Number.isFinite(wakeAt.getTime())) throw new WorkflowDelayValidationError("Delay wake time is invalid");
		return wakeAt;
	}
	if (mode === "datetime" && typeof delay.at === "string") {
		return parseWorkflowWakeAt(delay.at, timezone);
	}
	throw new WorkflowDelayValidationError("Delay settings are invalid");
}
