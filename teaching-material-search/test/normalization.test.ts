import { describe, expect, it } from 'vitest';
import { normalizeResource } from '../src/domain/normalization';

describe('normalizeResource', () => {
  it('canonicalizes noisy subject aliases and grade words', () => {
    const resource = normalizeResource({
      id: 'doc_aliases',
      title: 'Zeichnen und Malen',
      description: 'Kunstmaterial fuer die Klasse acht.',
      tags: ['ku', 'Klasse acht', 'Gymnasium', 'methodische_hinweise'],
      created_at: '2022-03-26T11:41:47.854Z',
      preview_image_url: null
    });

    expect(resource.subjects).toEqual(['kunst']);
    expect(resource.grades).toEqual([8]);
    expect(resource.schoolTypes).toEqual(['Gymnasium']);
  });

  it('preserves searchability for misspelled and abbreviated history tags', () => {
    const resource = normalizeResource({
      id: 'doc_history',
      title: 'Freiarbeit: Koeln und Nuernberg',
      description: 'Unterrichtsmaterial fuer Geschichte.',
      tags: ['histo', 'geschicte', 'ge', '9'],
      created_at: '2026-03-18T03:14:23.167Z',
      preview_image_url: null
    });

    expect(resource.subjects).toEqual(['geschichte']);
    expect(resource.grades).toEqual([9]);
    expect(resource.normalizedTags).toContain('geschicte');
  });

  it('ignores impossible grade tags while recording a warning', () => {
    const resource = normalizeResource({
      id: 'doc_invalid_grade',
      title: '',
      description: 'Lueckentext zum Thema Sonnenenergie.',
      tags: ['sonnenenergie', 'physik', '67', 'Gymnasium'],
      created_at: '2022-08-03T11:48:56.423Z',
      preview_image_url: null
    });

    expect(resource.title).toBe('Sonnenenergie');
    expect(resource.grades).toEqual([]);
    expect(resource.legacyWarnings).toContain('ignored_invalid_grade:67');
    expect(resource.legacyWarnings).toContain('missing_title');
  });

  it('expands German umlauts for ASCII user queries', () => {
    const resource = normalizeResource({
      id: 'doc_umlaut',
      title: 'Fruehe christliche Schriften',
      description: 'Material zu Schöpfung und Erlösung.',
      tags: ['fruehe-christliche-schriften', 'schoepfung-und-erloesung', 'religion'],
      created_at: '2025-09-26T07:01:36.461Z',
      preview_image_url: null
    });

    expect(resource.searchText).toContain('schoepfung');
    expect(resource.normalizedSearchText).toContain('erloesung');
    expect(resource.subjects).toEqual(['religion / ethik']);
  });

  it('uses the same duplicate hash for identical content with different ids', () => {
    const first = normalizeResource({
      id: 'doc_000011',
      title: 'Vergleich von Programmen - faecheruebergreifend',
      description: 'Unterrichtsmaterial zu Vergleich von Programmen.',
      tags: ['vergleich-von-programmen', 'mathematik', 'rechnen', '5'],
      created_at: '2023-05-21T13:28:06.292Z',
      preview_image_url: 'https://example.com/preview.png'
    });
    const second = normalizeResource({
      id: 'doc_000012',
      title: 'Vergleich von Programmen - faecheruebergreifend',
      description: 'Unterrichtsmaterial zu Vergleich von Programmen.',
      tags: ['rechnen', 'mathematik', 'vergleich-von-programmen', '5'],
      created_at: '2023-05-21T13:28:06.292Z',
      preview_image_url: 'https://example.com/preview.png'
    });

    expect(first.contentHash).toBe(second.contentHash);
  });
});
