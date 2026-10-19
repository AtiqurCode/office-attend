import { z } from 'zod';

export const employeeProfileSchema = z.object({
  employeeCode: z
    .string()
    .trim()
    .min(2, 'Employee code must be at least 2 characters')
    .max(32, 'Employee code is too long'),
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name is required')
    .max(120, 'Full name is too long'),
  department: z.string().trim().max(80).optional().or(z.literal('')),
  designation: z.string().trim().max(80).optional().or(z.literal('')),
  email: z
    .string()
    .trim()
    .email('Enter a valid email')
    .optional()
    .or(z.literal('')),
});

export type EmployeeProfileInput = z.infer<typeof employeeProfileSchema>;
