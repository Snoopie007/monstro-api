import z from 'zod';
export const UpdateProgramSchema = z.object({
    description: z.string(),
    name: z.string().min(8),
});



export const InviteMemberSchema = z.object({
    programId: z.number(),
    email: z.string().email(),
});
