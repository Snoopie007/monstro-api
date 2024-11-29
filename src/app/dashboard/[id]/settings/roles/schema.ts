import z from 'zod';

const CreateRoleSchema = z.object({
    name: z.string().min(2, { message: "Required" }),
});

export {
    CreateRoleSchema
}