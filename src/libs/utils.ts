import type { ProgramSession, RecurringReservation, Reservation } from "@/types";
import { addDays, isBefore, isSameDay } from "date-fns";


async function tryCatch<T, E = Error>(
    promise: Promise<T>
): Promise<{ error: E | null; result: T | null }> {
    try {
        const result = await promise;

        return { error: null, result };
    } catch (error) {
        console.log("Error in tryCatch", error);
        return { error: error as E, result: null };
    }
}

// Simple referral code generator
function generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}



interface GenerateVRsParams {
    reservations: Reservation[];
    rrs: RecurringReservation[];
    startDate: Date;
    endDate: Date;
}

function generateVRs({ reservations, rrs, startDate, endDate }: GenerateVRsParams): Reservation[] {
    const virtualReservations: Reservation[] = [];

    rrs.forEach((rr) => {
        let currentDate = new Date(startDate);
        const sessionDay = rr.session?.day;
        if (!sessionDay) {
            return;
        }

        const currentDay = currentDate.getDay();

        if (currentDay !== sessionDay) {
            currentDate = addDays(currentDate, (sessionDay - currentDay + 7) % 7);
        }

        while (currentDate <= endDate) {
            const currentDateString = currentDate.toISOString().split("T")[0];
            const exception = rr.exceptions?.find(
                (e) => e.occurrenceDate.toISOString() === currentDateString
            );
            const existingReservation = reservations.find((r) => {
                return (
                    r.startOn.toISOString().split("T")[0] === currentDateString &&
                    r.sessionId === rr.sessionId
                );
            });

            if (exception || existingReservation) {
                currentDate = addDays(currentDate, (rr.intervalThreshold || 1) * 7);
                continue;
            }

            // Create proper reservation object with required fields
            const startOn = new Date(currentDate);
            const endOn = new Date(
                startOn.getTime() + (rr.session?.duration || 60) * 60000
            );


            const attendance = rr.attendances?.find(a => isSameDay(a.startTime, startOn));

            const { id, startDate, session, exceptions, attendances, ...rest } = rr;
            virtualReservations.push({
                id: `${id}-${currentDateString}`,
                ...rest,
                startOn: startOn,
                endOn: endOn,
                attendance,
                recurringId: id,
                isRecurring: true,
            } as Reservation);
            currentDate = addDays(currentDate, (rr.intervalThreshold || 1) * 7);
        }
    });

    return virtualReservations;
}


function sanitizeHTML(html: string) {
    // Remove potentially dangerous tags and attributes
    const dangerousTags = [
        "script",
        "iframe",
        "object",
        "embed",
        "form",
        "input",
        "button",
        "link",
        "meta",
        "style",
        "base",
        "applet",
        "frame",
        "frameset",
    ];

    const dangerousAttributes = [
        "onload",
        "onerror",
        "onclick",
        "onmouseover",
        "onmouseout",
        "onkeydown",
        "onkeyup",
        "onchange",
        "onsubmit",
        "onfocus",
        "onblur",
        "javascript:",
        "vbscript:",
        "data:",
    ];

    // Remove dangerous tags completely
    let sanitized = html;
    dangerousTags.forEach((tag) => {
        const regex = new RegExp(`<${tag}[^>]*>.*?<\/${tag}>`, "gsi");
        sanitized = sanitized.replace(regex, "");
        // Also remove self-closing versions
        const selfClosingRegex = new RegExp(`<${tag}[^>]*\/?>`, "gsi");
        sanitized = sanitized.replace(selfClosingRegex, "");
    });

    // Remove dangerous attributes from remaining tags
    dangerousAttributes.forEach((attr) => {
        const regex = new RegExp(`\\s${attr}\\s*=\\s*["'][^"']*["']`, "gsi");
        sanitized = sanitized.replace(regex, "");
        // Also handle attributes without quotes
        const noQuoteRegex = new RegExp(`\\s${attr}\\s*=\\s*[^\\s>]+`, "gsi");
        sanitized = sanitized.replace(noQuoteRegex, "");
    });

    // Remove any remaining script content between tags
    sanitized = sanitized.replace(
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gim,
        ""
    );

    // Remove HTML comments that could contain malicious code
    sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, "");

    // Only remove dangerous href and src attributes, not all instances
    sanitized = sanitized.replace(
        /\s(href|src)\s*=\s*["']javascript:[^"']*["']/gis,
        ""
    );
    sanitized = sanitized.replace(
        /\s(href|src)\s*=\s*["']vbscript:[^"']*["']/gis,
        ""
    );
    sanitized = sanitized.replace(
        /\s(href|src)\s*=\s*["']data:[^"']*["']/gis,
        ""
    );

    return sanitized;
}
function cleanupHTML(html: string): string {
    if (!html) return "";

    // Fix common HTML structure issues
    let cleaned = html;

    // Remove excessive whitespace while preserving structure
    cleaned = cleaned.replace(/\s+/g, " ").trim();

    // Ensure proper section opening tags (if missing)
    cleaned = cleaned.replace(/(\s*<\/section>\s*<h[1-6])/g, "$1");

    return cleaned;
}
function interpolate(template: string, variables: Record<string, any>): string {
    if (!template) return "";

    // First clean up the HTML structure
    const cleanedTemplate = cleanupHTML(template);

    // Then sanitize to remove dangerous content but preserve legitimate HTML
    const sanitizedTemplate = sanitizeHTML(cleanedTemplate);

    // Replace variable spans with their values
    const output = sanitizedTemplate.replace(
        /<span[^>]*data-value="([^"]*)"[^>]*>@[^<]*<\/span>/g,
        (_, path) => {
            const value = path
                .split(".")
                .reduce(
                    (obj: Record<string, any> | undefined, key: string) =>
                        obj && typeof obj === "object" ? obj[key] : undefined,
                    variables
                );

            return value !== undefined ? String(value) : `@${path}`;
        }
    );

    // Clean up extra whitespace and return
    return output.trim().replace(/\s+/g, " ");
}

function interEmailsAndText(
    template: string,
    data: Record<string, any>
): string {
    return template.replace(
        /\{\{([^}]+)\}\}/g,
        (match: string, p1: string): string => {
            // Split the path into parts (e.g. "user.name" -> ["user", "name"])
            const parts = p1.trim().split(".");

            // Check if there's a pipe for formatting
            const [path, style] = parts[parts.length - 1]?.split("|") ?? [];
            parts[parts.length - 1] = path ?? "";

            // Traverse the object following the path
            let value: Record<string, any> = data;
            for (const part of parts) {
                if (value === undefined || value === null) return match;
                value = value[part];
            }

            // Apply style if specified
            if (style && style.trim() === "lowercase") {
                return String(value ?? match).toLowerCase();
            }

            return String(value ?? match);
        }
    );
}

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function isSessionPasted(session: ProgramSession, selectedDay: Date) {
    const today = new Date();
    const sessionTime = getSessionTime(session);
    const isPasted = isBefore(selectedDay, today) ? sessionTime.getTime() < today.getTime() : false;
    return isPasted;
}

function getSessionTime(session: ProgramSession) {
    const [hours, minutes] = session.time.split(':').map(Number);
    const sessionTime = new Date();
    sessionTime.setHours(hours!, minutes!, 0, 0);
    return sessionTime;
}

function getSessionState(session: ProgramSession, mid: string) {
    const reservations = session.reservations?.length ?? 0;
    let recurringReservations = 0;
    if (session.recurringReservations && session.recurringReservations.length > 0) {
        recurringReservations = session.recurringReservations.filter(rr => rr.exceptions?.length === 0).length;
    }
    const availability = (session.program?.capacity ?? 0) - (reservations + recurringReservations);

    const hasRecurringReservations = session.recurringReservations?.some(r => r.memberId === mid) ?? false;
    const hasReservations = session.reservations?.some(r => r.memberId === mid) ?? false;

    const isReserved = hasRecurringReservations || hasReservations;

    const isFull = availability <= 0;

    return { isReserved, isFull };
}

export {
    interEmailsAndText,
    generateReferralCode,
    generateVRs,
    interpolate,
    generateOtp,
    tryCatch,
    isSessionPasted,
    getSessionTime,
    getSessionState
};