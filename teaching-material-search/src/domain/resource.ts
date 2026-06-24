import { z } from 'zod';

export const LegacyResourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  created_at: z.union([z.string(), z.number(), z.date()]).nullable().optional(),
  preview_image_url: z.string().nullable().optional()
});

export type LegacyResource = z.infer<typeof LegacyResourceSchema>;

export interface NormalizedResource {
  id: string;
  title: string | null;
  description: string | null;
  originalTags: string[];
  normalizedTags: string[];
  subjects: string[];
  grades: number[];
  schoolTypes: string[];
  materialTypes: string[];
  publishers: string[];
  legacyWarnings: string[];
  previewImageUrl: string | null;
  createdAt: Date | null;
  contentHash: string;
  raw: LegacyResource;
  searchText: string;
  normalizedSearchText: string;
  weightedSearch: {
    title: string;
    description: string;
    facets: string;
  };
}

export interface SearchResult {
  id: string;
  title: string | null;
  description: string | null;
  tags: string[];
  subjects: string[];
  grades: number[];
  schoolTypes: string[];
  materialTypes: string[];
  publishers: string[];
  previewImageUrl: string | null;
  createdAt: string | null;
  score: number;
  snippet: string | null;
}

export interface SearchResponse {
  query: string;
  normalizedQuery: string;
  limit: number;
  offset: number;
  total: number;
  results: SearchResult[];
}
