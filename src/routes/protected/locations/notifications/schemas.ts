import { z } from "zod";

export const AffectedMemberSchema = z.object({
    memberId: z.string(),
    email: z.email(),
    firstName: z.string(),
    lastName: z.string().optional(),
    reservations: z.array(z.object({
        id: z.string(),
        className: z.string(),
        originalTime: z.string(),
    })),
});

export const HolidayCancellationProps = {
    params: z.object({
        lid: z.string(),
    }),
    body: z.object({
        holidayName: z.string(),
        holidayDate: z.string(),
        affectedMembers: z.array(AffectedMemberSchema),
        locationName: z.string(),
        locationAddress: z.string().optional(),
        locationEmail: z.string().email().optional(),
        locationPhone: z.string().optional(),
        makeupBaseUrl: z.string().optional(),
    }),
};

export const MakeupConfirmationProps = {
    params: z.object({
        lid: z.string(),
    }),
    body: z.object({
        memberId: z.string(),
        memberEmail: z.string().email(),
        memberFirstName: z.string(),
        originalClass: z.object({
            name: z.string(),
            date: z.string(),
            time: z.string(),
        }),
        makeupClass: z.object({
            name: z.string(),
            date: z.string(),
            time: z.string(),
            instructorFirstName: z.string().optional(),
            instructorLastName: z.string().optional(),
        }),
        creditsRemaining: z.number().optional(),
        locationName: z.string(),
        locationAddress: z.string().optional(),
    }),
};

export const SessionCancellationMemberSchema = z.object({
    memberId: z.string(),
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string().optional(),
});

export const SessionCancellationProps = {
    params: z.object({
        lid: z.string(),
    }),
    body: z.object({
        sessionName: z.string(),
        sessionDate: z.string(),
        sessionTime: z.string(),
        instructorFirstName: z.string().optional(),
        instructorLastName: z.string().optional(),
        reason: z.string().optional(),
        affectedMembers: z.array(SessionCancellationMemberSchema),
        locationName: z.string(),
        locationAddress: z.string().optional(),
        locationEmail: z.string().email().optional(),
        locationPhone: z.string().optional(),
        makeupBaseUrl: z.string().optional(),
    }),
};
