import { z } from "zod";
export const UpdatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters long." })
      .refine((v) => /[!@#$&]/.test(v), { message: "Password must contain at least one symbol (!@#$&)." })
      .refine((v) => /[A-Z]/.test(v), { message: "Password must contain at least one uppercase letter." })
      .refine((v) => /[0-9]/.test(v), { message: "Password must contain at least one number." })
      .refine(
        (v) => !/[()*+\-[\]{}|`~<>,.\/?^]/.test(v),
        { message: "Password contains invalid characters." }
      ),

    confirmPassword: z.string(), // Just ensure it's a string; no additional validations.
    currentPassword: z
      .string()
      .min(8, { message: "Password must be at least 8 characters long." })
      .refine((v) => /[!@#$&]/.test(v), { message: "Password must contain at least one symbol (!@#$&)." })
      .refine((v) => /[A-Z]/.test(v), { message: "Password must contain at least one uppercase letter." })
      .refine((v) => /[0-9]/.test(v), { message: "Password must contain at least one number." })
      .refine(
        (v) => !/[()*+\-[\]{}|`~<>,.\/?^]/.test(v),
        { message: "Password contains invalid characters." }
      ),
  })
  .refine(
    (data) => data.password === data.confirmPassword,
    {
      message: "Password and confirm password must match.",
      path: ["confirmPassword"], // Error is tied to the confirmPassword field
    }
  );

