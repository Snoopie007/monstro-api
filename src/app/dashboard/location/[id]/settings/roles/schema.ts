import { RoleColor } from '@subtrees/types';
import z from 'zod';

const CreateRoleSchema = z.object({
    name: z.string().min(2, { message: "Required" }),
    color: z.custom<RoleColor>(),
    permissions: z.array(z.string())
});

export {
    CreateRoleSchema
}