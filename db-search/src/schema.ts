import { z } from 'zod';

const CreatedAt = z
  .union([z.string().min(1), z.number()])
  .transform((value) => {
    const date = typeof value === 'number' ? new Date(value) : new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new Error('invalid created_at');
    }
    return date.toISOString();
  });

// Tolerant on purpose: the legacy catalog is messy. We require an id and a
// parseable created_at, but accept empty titles, null descriptions, missing
// images, arbitrary tag strings, and epoch-ms timestamps.
export const DocumentInput = z.object({
  id: z.string().min(1),
  title: z.string().default(''),
  description: z.string().nullable().default(null),
  tags: z.array(z.string()).default([]),
  created_at: CreatedAt,
  preview_image_url: z.string().nullable().default(null),
});

export type DocumentInput = z.infer<typeof DocumentInput>;
