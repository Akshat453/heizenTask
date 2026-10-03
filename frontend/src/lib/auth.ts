import { z } from "zod";

export const authenticatedUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.email(),
  role: z.string().min(1),
  permissions: z.array(z.string()),
});

export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>;

export const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export type LoginInput = z.infer<typeof loginSchema>;
