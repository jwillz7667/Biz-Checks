import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email().max(254),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(256)
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a digit'),
  fullName: z.string().min(1).max(200),
  organizationName: z.string().min(1).max(200),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(256),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const RefreshSchema = z.object({
  refreshToken: z.string().min(20).max(512),
});

export const SessionResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    fullName: z.string(),
    organizations: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        role: z.enum(['OWNER', 'ADMIN', 'DESIGNER', 'PRINTER', 'VIEWER']),
      }),
    ),
  }),
});
