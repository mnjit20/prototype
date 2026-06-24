import crypto from 'node:crypto';
import { LegacyResource, LegacyResourceSchema, NormalizedResource } from './resource';

const SUBJECT_ALIASES: Record<string, string> = {
  biologie: 'biologie',
  biologe: 'biologie',
  bio: 'biologie',
  chemie: 'chemie',
  chemei: 'chemie',
  deutsch: 'deutsch',
  de: 'deutsch',
  deutsh: 'deutsch',
  sprache: 'deutsch',
  englisch: 'englisch',
  english: 'englisch',
  en: 'englisch',
  vokabeln: 'englisch',
  erziehungswissenschaft: 'erziehungswissenschaft',
  paedagogik: 'erziehungswissenschaft',
  padagogik: 'erziehungswissenschaft',
  padagodik: 'erziehungswissenschaft',
  geschichte: 'geschichte',
  geschicte: 'geschichte',
  histo: 'geschichte',
  ge: 'geschichte',
  informatik: 'informatik',
  info: 'informatik',
  kunst: 'kunst',
  ku: 'kunst',
  'bildende kunst': 'kunst',
  latein: 'latein',
  mathematik: 'mathematik',
  matematik: 'mathematik',
  mathe: 'mathematik',
  rechnen: 'mathematik',
  philosophie: 'philosophie',
  philo: 'philosophie',
  phil: 'philosophie',
  physik: 'physik',
  phy: 'physik',
  religion: 'religion / ethik',
  ethik: 'religion / ethik',
  reli: 'religion / ethik',
  'religion ethik': 'religion / ethik',
  sachunterricht: 'sachunterricht',
  sachkunde: 'sachunterricht',
  sozialkunde: 'sozialkunde',
  sowi: 'sozialkunde',
  gewi: 'sozialkunde',
  sport: 'sport',
  spo: 'sport',
  bewegung: 'sport',
  wirtschaft: 'wirtschaft',
  wiwi: 'wirtschaft'
};

const SCHOOL_TYPE_ALIASES: Record<string, string> = {
  grundschule: 'Grundschule',
  gymnasium: 'Gymnasium',
  'mittlere schulformen': 'Mittlere Schulformen',
  'berufliche schulen': 'Berufliche Schulen',
  sekundarstufe: 'Sekundarstufe'
};

const MATERIAL_TYPE_ALIASES: Record<string, string> = {
  arbeitsblatt: 'Arbeitsblatt',
  bingo: 'Bingo',
  diagnosebogen: 'Diagnosebogen',
  diktat: 'Diktat',
  domino: 'Domino',
  'escape room': 'Escape Room',
  freiarbeit: 'Freiarbeit',
  lernkartei: 'Lernkartei',
  lernspiel: 'Lernspiel',
  lueckentext: 'Lueckentext',
  luckentext: 'Lueckentext',
  lapbook: 'Lapbook',
  merkblatt: 'Merkblatt',
  projektarbeit: 'Projektarbeit',
  quiz: 'Quiz',
  rollenspiel: 'Rollenspiel',
  steckbrief: 'Steckbrief',
  tafelbild: 'Tafelbild',
  test: 'Test',
  wochenplan: 'Wochenplan'
};

const GRADE_WORDS: Record<string, number> = {
  eins: 1,
  ein: 1,
  erste: 1,
  zwei: 2,
  zweite: 2,
  drei: 3,
  dritte: 3,
  vier: 4,
  vierte: 4,
  funf: 5,
  fuenf: 5,
  funfte: 5,
  fuenfte: 5,
  sechs: 6,
  sechste: 6,
  sieben: 7,
  siebte: 7,
  acht: 8,
  achte: 8,
  neun: 9,
  neunte: 9,
  zehn: 10,
  zehnte: 10,
  elf: 11,
  elfte: 11,
  zwolf: 12,
  zwoelf: 12,
  zwolfte: 12,
  zwoelfte: 12,
  dreizehn: 13,
  dreizehnte: 13
};

const NOISE_TAGS = new Set([
  'anhang',
  'ausdrucken',
  'download',
  'druckfertig',
  'entwurf',
  'final v2',
  'klassensatz',
  'kopie',
  'kopiervorlage',
  'pdf',
  'scan',
  'version 2',
  'wichtig'
]);

export function germanAscii(value: string): string {
  return value
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss');
}

export function normalizeForSearch(value: string): string {
  return germanAscii(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_/\\-]+/g, ' ')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactDisplayValue(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function uniqueSorted<T extends string | number>(values: T[]): T[] {
  return [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b), 'de'));
}

function canonicalTag(value: string): string {
  return normalizeForSearch(value);
}

function parseGrades(tagKey: string): number[] {
  const grades: number[] = [];

  for (const [word, grade] of Object.entries(GRADE_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(tagKey)) {
      grades.push(grade);
    }
  }

  const rangeMatch = tagKey.match(/\b(?:klasse|kl|stufe|jahrgangsstufe)?\s*(\d{1,2})\s*(?:bis|-)\s*(\d{1,2})\b/);
  if (rangeMatch) {
    const start = Number(rangeMatch[1]);
    const end = Number(rangeMatch[2]);
    for (let grade = Math.min(start, end); grade <= Math.max(start, end); grade += 1) {
      grades.push(grade);
    }
  }

  const matches = [...tagKey.matchAll(/\b(?:klasse|kl|stufe|jahrgangsstufe)?\.?\s*(\d{1,2})(?:te)?(?:\s*klasse)?\b/g)];
  for (const match of matches) {
    grades.push(Number(match[1]));
  }

  return uniqueSorted(grades.filter((grade) => grade >= 1 && grade <= 13));
}

function inferTitleFromTags(tags: string[], id: string): string {
  const topicTag = tags.find((tag) => {
    const key = canonicalTag(tag);
    return key.length > 2 && !SUBJECT_ALIASES[key] && !SCHOOL_TYPE_ALIASES[key] && !NOISE_TAGS.has(key);
  });

  if (!topicTag) {
    return `Untitled material ${id}`;
  }

  return compactDisplayValue(topicTag)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parseDate(value: LegacyResource['created_at'], warnings: string[]): Date | null {
  if (value === null || value === undefined) {
    warnings.push('missing_created_at');
    return null;
  }

  const date = typeof value === 'number' ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    warnings.push('invalid_created_at');
    return null;
  }

  return date;
}

function extractPublishers(rawTags: string[]): string[] {
  return uniqueSorted(
    rawTags
      .filter((tag) => /\b(verlag|media|press|lernen|pädagogik|paedagogik)\b/i.test(tag))
      .map(compactDisplayValue)
  );
}

function buildSearchText(parts: Array<string | string[] | null | undefined>): string {
  return parts
    .flatMap((part) => (Array.isArray(part) ? part : [part]))
    .filter((part): part is string => Boolean(part && part.trim()))
    .flatMap((part) => [part, germanAscii(part), normalizeForSearch(part)])
    .join(' ');
}

function hashContent(resource: LegacyResource): string {
  const stableContent = {
    title: resource.title ?? '',
    description: resource.description ?? '',
    tags: [...(resource.tags ?? [])].map(canonicalTag).sort(),
    preview_image_url: resource.preview_image_url ?? ''
  };

  return crypto.createHash('sha256').update(JSON.stringify(stableContent)).digest('hex');
}

export function normalizeResource(input: unknown): NormalizedResource {
  const raw = LegacyResourceSchema.parse(input);
  const warnings: string[] = [];
  const originalTags = (raw.tags ?? []).filter((tag) => tag.trim().length > 0).map(compactDisplayValue);
  const tagKeys = originalTags.map(canonicalTag).filter(Boolean);

  if (originalTags.length === 0) {
    warnings.push('empty_tags');
  }

  const title = raw.title && raw.title.trim() ? compactDisplayValue(raw.title) : null;
  const description =
    raw.description && raw.description.trim() ? compactDisplayValue(raw.description) : null;

  if (!title) {
    warnings.push('missing_title');
  }

  if (!description) {
    warnings.push('missing_description');
  }

  const subjectKeys = new Set<string>();
  const schoolTypes = new Set<string>();
  const materialTypes = new Set<string>();
  const grades: number[] = [];
  const invalidGradeTags: string[] = [];

  for (const key of tagKeys) {
    if (SUBJECT_ALIASES[key]) {
      subjectKeys.add(SUBJECT_ALIASES[key]);
    }

    if (SCHOOL_TYPE_ALIASES[key]) {
      schoolTypes.add(SCHOOL_TYPE_ALIASES[key]);
    }

    if (MATERIAL_TYPE_ALIASES[key]) {
      materialTypes.add(MATERIAL_TYPE_ALIASES[key]);
    }

    const parsedGrades = parseGrades(key);
    grades.push(...parsedGrades);

    if (/^\d{1,4}$/.test(key) && parsedGrades.length === 0) {
      invalidGradeTags.push(key);
    }
  }

  const titleAndDescriptionKey = normalizeForSearch(`${title ?? ''} ${description ?? ''}`);
  for (const [key, materialType] of Object.entries(MATERIAL_TYPE_ALIASES)) {
    if (new RegExp(`\\b${key}\\b`).test(titleAndDescriptionKey)) {
      materialTypes.add(materialType);
    }
  }

  for (const invalidTag of invalidGradeTags) {
    warnings.push(`ignored_invalid_grade:${invalidTag}`);
  }

  const normalizedTags = uniqueSorted(
    tagKeys.filter((key) => key.length > 0 && !NOISE_TAGS.has(key))
  );
  const subjects = uniqueSorted([...subjectKeys]);
  const parsedGrades = uniqueSorted(grades);
  const publishers = extractPublishers(originalTags);
  const fallbackTitle = title ?? inferTitleFromTags(originalTags, raw.id);

  const facets = buildSearchText([
    normalizedTags,
    subjects,
    parsedGrades.map((grade) => `klasse ${grade}`),
    [...schoolTypes],
    [...materialTypes],
    publishers
  ]);

  const titleSearch = buildSearchText([fallbackTitle, subjects, [...materialTypes]]);
  const descriptionSearch = buildSearchText([description]);
  const searchText = buildSearchText([fallbackTitle, description, originalTags, normalizedTags, facets]);
  const createdAt = parseDate(raw.created_at, warnings);

  return {
    id: raw.id,
    title: title ?? fallbackTitle,
    description,
    originalTags,
    normalizedTags,
    subjects,
    grades: parsedGrades,
    schoolTypes: uniqueSorted([...schoolTypes]),
    materialTypes: uniqueSorted([...materialTypes]),
    publishers,
    legacyWarnings: uniqueSorted(warnings),
    previewImageUrl: raw.preview_image_url ?? null,
    createdAt,
    contentHash: hashContent(raw),
    raw,
    searchText,
    normalizedSearchText: normalizeForSearch(searchText),
    weightedSearch: {
      title: titleSearch,
      description: descriptionSearch,
      facets
    }
  };
}

export function normalizeQuery(value: string): string {
  return normalizeForSearch(value);
}

export function normalizeSubjectFilter(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return SUBJECT_ALIASES[normalizeForSearch(value)] ?? value;
}

export function normalizeSchoolTypeFilter(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return SCHOOL_TYPE_ALIASES[normalizeForSearch(value)] ?? value;
}

export function normalizeMaterialTypeFilter(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return MATERIAL_TYPE_ALIASES[normalizeForSearch(value)] ?? value;
}
