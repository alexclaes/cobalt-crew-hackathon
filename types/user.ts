import { z } from 'zod';

export interface User {
  id: string;
  name: string; // First name only
  address: string; // Full address including street
  lat: number;
  lon: number;
}

// Zod schema for User validation
export const UserSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, 'Name is required'),
  address: z.string().trim().min(1, 'Address is required'),
  lat: z.number().refine(val => val !== 0, 'Valid coordinates required'),
  lon: z.number().refine(val => val !== 0, 'Valid coordinates required'),
});

// Extended schema for UserEntry (includes UI-specific fields)
export const UserEntrySchema = UserSchema.extend({
  isPreConfigured: z.boolean(),
  userLabel: z.string(),
});
