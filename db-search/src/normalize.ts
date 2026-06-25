// Canonical subject slugs derived from messy legacy tags at ingest time.
// Covers the largest subject clusters in the catalog and their common
// abbreviations / misspellings (e.g. de, deutsh -> deutsch). Deliberately a
// reviewed static map, not DB-derived: clustering messy legacy values is the
// production enrichment layer's job (see ARCHITECTURE.md), kept deterministic
// and unit-testable here.
const SUBJECT_ALIASES: Record<string, string> = {
  reli: 'religion',
  ethik: 'religion',
  'religion-ethik': 'religion',
  de: 'deutsch',
  deutsh: 'deutsch',
  deutsch: 'deutsch',
  histo: 'geschichte',
  ge: 'geschichte',
  geschicte: 'geschichte',
  geschicht: 'geschichte',
  mathe: 'mathematik',
  matematik: 'mathematik',
  phil: 'philosophie',
  philo: 'philosophie',
  paedagogik: 'paedagogik',
  'pädagogik': 'paedagogik',
  'pädagogig': 'paedagogik',
  erziehungswissenschaft: 'paedagogik',
  nawi: 'naturwissenschaften',
  spo: 'sport',
};

const GRADE_TAG = /^klasse\s*(\d{1,2})$/i;
const GRADE_BARE = /^(\d{1,2})$/;

function slug(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, '-');
}

function gradeFromTag(tag: string): string | null {
  const trimmed = tag.trim();
  const klasse = trimmed.match(GRADE_TAG);
  if (klasse) return klasse[1]!;
  if (GRADE_BARE.test(trimmed)) return trimmed;
  return null;
}

/** Derive searchable facets (canonical subjects + grades) from raw legacy tags. */
export function enrichFacets(tags: string[]): string[] {
  const facets = new Set<string>();

  for (const raw of tags) {
    const tag = slug(raw);
    if (!tag) continue;

    const alias = SUBJECT_ALIASES[tag];
    if (alias) facets.add(alias);

    const grade = gradeFromTag(raw);
    if (grade) facets.add(`klasse-${grade}`);

    if (tag.startsWith('klasse-')) {
      const embedded = tag.slice('klasse-'.length);
      if (/^\d{1,2}$/.test(embedded)) facets.add(`klasse-${embedded}`);
    }
  }

  return [...facets];
}
