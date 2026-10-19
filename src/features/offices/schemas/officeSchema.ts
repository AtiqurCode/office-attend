import { z } from 'zod';

const numberFromInput = (min: number, max: number, integer = false) =>
  z
    .union([z.number(), z.string()])
    .transform((value, ctx) => {
      const n = typeof value === 'number' ? value : Number(value);
      if (Number.isNaN(n)) {
        ctx.addIssue({ code: 'custom', message: 'Must be a number' });
        return z.NEVER;
      }
      if (n < min || n > max) {
        ctx.addIssue({ code: 'custom', message: `Must be between ${min} and ${max}` });
        return z.NEVER;
      }
      return integer ? Math.round(n) : n;
    });

export const officeSchema = z.object({
  name: z.string().trim().min(2, 'Office name is required').max(120),
  latitude: numberFromInput(-90, 90),
  longitude: numberFromInput(-180, 180),
  radiusMeters: numberFromInput(10, 5000, true),
  maxLocationAccuracyMeters: numberFromInput(5, 500, true),
  address: z.string().trim().max(240).optional().or(z.literal('')),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
  isActive: z.boolean(),
});

export type OfficeInput = z.output<typeof officeSchema>;
export type OfficeFormValues = z.input<typeof officeSchema>;
